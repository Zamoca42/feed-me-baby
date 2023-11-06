import { Injectable } from '@nestjs/common';
import { RestaurantRepository } from './restaurant.repository';
import { SingleBar, Presets } from 'cli-progress';
import axios, { AxiosError } from 'axios';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { RestaurantApiResponseDto } from './dto/restaurant-api-response.dto.ts';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto.ts';
import { Restaurant } from './entity/restaurant.entity';

@Injectable()
export class RestaurantService {
  private activeCount = 0;
  private closedCount = 0;
  private noDataCount = 0;
  private pageSize = 1;
  private maxPageSize = 1000;
  private scaleUpFactor = 2;
  private maxRetries = 5;
  private retryDelay = 1000;
  private initialMaxPagesEstimate = 300;
  private progressBar = new SingleBar({}, Presets.shades_classic);

  constructor(
    private restaurantRepository: RestaurantRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async syncRestaurantData(): Promise<void> {
    let index = 1;
    let totalProcessed = 0;
    const delayBetweenPages = 2000; // 페이지 사이 지연 2000ms

    // 프로그레스 바 시작
    this.progressBar.start(this.initialMaxPagesEstimate, 0);

    while (totalProcessed < 450000) {
      const promises = [];

      // 현재 페이지 사이즈만큼 반복하면서 프로미스 배열 생성
      for (let i = 0; i < this.pageSize; i++) {
        promises.push(this.processRestaurantDataPage(index + i));
      }

      // 모든 프로미스가 settle될 때까지 기다림
      const results = await Promise.allSettled(promises);
      let fulfilledCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          fulfilledCount++;
          if (result.value === false) {
            // 성공적으로 처리된 데이터가 없으면 프로그레스 바를 정지하고 함수를 종료
            console.log(
              `최종 처리된 식당 수: 저장된 식당 ${this.activeCount}, 폐업된 식당 ${this.closedCount}, 데이터 없음 ${this.noDataCount}`,
            );
            this.progressBar.stop();
            return;
          }
        } else if (result.status === 'rejected') {
          // 오류가 발생했을 경우, 페이지 사이즈를 줄임
          console.error('페이지 처리 중 오류 발생:', result.reason);
          this.pageSize = Math.max(1, this.pageSize / this.scaleUpFactor);
        }
      }

      totalProcessed += fulfilledCount;

      // 모든 프로미스가 성공하면 페이지 사이즈를 증가
      if (fulfilledCount === this.pageSize) {
        this.pageSize = Math.min(
          this.maxPageSize,
          this.pageSize * this.scaleUpFactor,
        );
      }

      // 성공한 페이지가 없으면 반복 종료
      if (fulfilledCount === 0) {
        break;
      }

      index += fulfilledCount;
      this.progressBar.update(totalProcessed);

      const count = await this.restaurantRepository.count();
      process.stdout.write(`\n 현재 Restaurant 테이블의 행 개수: ${count}\r`);
      // 다음 요청 전에 지연을 적용
      await this.delayForNextBatch(delayBetweenPages);
    }

    // 프로그레스 바 정지 및 로그 출력
    this.progressBar.stop();
    console.log(
      `최종 처리된 식당 수: 저장된 식당 ${this.activeCount}, 폐업된 식당 ${this.closedCount}, 데이터 없음 ${this.noDataCount}`,
    );
  }

  private async processRestaurantDataPage(
    pageIndex: number,
    retryCount = 5,
  ): Promise<boolean> {
    const pageSize = 1000;
    const url = `https://openapi.gg.go.kr/GENRESTRT?KEY=${process.env.API_KEY}&Type=json&pIndex=${pageIndex}&pSize=${pageSize}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (!data.GENRESTRT || !data.GENRESTRT[1] || !data.GENRESTRT[1].row) {
        return false;
      }

      await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          await this.handleDatabaseOperations(
            data.GENRESTRT[1].row,
            transactionalEntityManager,
          );
        },
      );

      return true;
    } catch (error) {
      if (this.shouldRetry(error)) {
        const delay = this.retryDelay + Math.random() * 1000;
        console.error(
          `트랜잭션 실패, 재시도 ${retryCount + 1}/${this.maxRetries}:`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (retryCount < this.maxRetries) {
          return this.processRestaurantDataPage(pageIndex, retryCount + 1);
        } else {
          console.error(
            `트랜잭션 최종 재시도 실패, 페이지 ${pageIndex}:`,
            error,
          );
          throw error;
        }
      } else {
        console.error(`트랜잭션 실패, 페이지 ${pageIndex}:`, error);
        throw error;
      }
    }
  }

  private shouldRetry(error: AxiosError): boolean {
    return (
      (error.response && error.response.status === 503) ||
      (error.code && error.code === 'ECONNABORTED')
    );
  }

  private async handleDatabaseOperations(
    restaurants: RestaurantApiResponseDto[],
    transactionalEntityManager: EntityManager,
  ): Promise<void> {
    for (const restaurantData of restaurants) {
      await this.processSingleRestaurantData(
        restaurantData,
        transactionalEntityManager,
      );
    }
  }

  private async processSingleRestaurantData(
    restaurantData: RestaurantApiResponseDto,
    transactionalEntityManager: EntityManager,
  ): Promise<void> {
    try {
      const {
        UNITY_BSN_STATE_NM: businessState,
        MANAGE_NO: uniqueId,
        BIZPLC_NM: name,
        REFINE_ROADNM_ADDR: address,
        REFINE_WGS84_LAT: latitude,
        REFINE_WGS84_LOGT: longitude,
        LOCPLC_FACLT_TELNO: telephone,
        SANITTN_BIZCOND_NM: categoryName,
        REFINE_LOTNO_ADDR: lotnoAddress,
        SIGUN_NM: cityName,
      } = restaurantData;

      // 폐업 상태일 때의 처리
      if (businessState === '폐업') {
        const existingRestaurant =
          await this.restaurantRepository.findByUniqueId(
            uniqueId,
            transactionalEntityManager,
          );

        if (existingRestaurant && !existingRestaurant.deletedAt) {
          await this.restaurantRepository.softDeleteRestaurant(
            uniqueId,
            transactionalEntityManager,
          );
        }
        this.closedCount++;
        return;
      }

      // 필수 정보가 없는 경우 처리
      if (!name || !address || !latitude || !longitude) {
        this.noDataCount++;
        return;
      }

      // 문자열을 숫자로 변환
      const parsedLatitude = parseFloat(latitude);
      const parsedLongitude = parseFloat(longitude);

      // 변환된 숫자가 유효하지 않으면 처리 중단
      if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
        console.error(
          `Invalid latitude or longitude value: ${latitude}, ${longitude}`,
        );
        this.noDataCount++;
        return;
      }

      // 전화번호 정제
      const cleanedTelephone = telephone ? telephone.replace(/\s/g, '') : null;
      const finalTelephone =
        cleanedTelephone && this.validateAndFormatTelephone(cleanedTelephone);

      // 최종 주소 결정 (도로명 주소가 우선, 없으면 지번 주소 사용)
      const finalAddress = address || lotnoAddress;

      // 업데이트 DTO 구성
      const updateDto: UpdateRestaurantDto = {
        uniqueId,
        name,
        address: finalAddress,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        telephone: finalTelephone,
        cityName,
        categoryName,
      };

      // 식당 데이터 생성 또는 업데이트
      await this.createOrUpdateRestaurantInTransaction(
        updateDto,
        transactionalEntityManager,
      );
    } catch (error) {
      console.error(`Error processing restaurant data: ${error}`);
      this.noDataCount++;
    }
  }

  private async createOrUpdateRestaurantInTransaction(
    updateDto: UpdateRestaurantDto,
    transactionalEntityManager: EntityManager,
  ): Promise<void> {
    try {
      let restaurantSaved = false;

      const restaurant = await this.restaurantRepository.findOrCreate(
        updateDto.uniqueId,
        updateDto,
        transactionalEntityManager,
      );

      // findOrCreate 메소드가 새 레스토랑을 생성했는지 확인합니다.
      if (!restaurant.wasExisting) {
        restaurantSaved = true;
      }

      await this.restaurantRepository.assignRelations(
        updateDto,
        restaurant.entity,
        transactionalEntityManager,
      );

      // 기존 레스토랑 정보를 업데이트합니다.
      // findOrCreate에서 이미 존재하는 레스토랑을 찾거나 새로 생성하고,
      // 새로 생성된 경우 wasExisting 프로퍼티로 식별할 수 있습니다.
      await transactionalEntityManager.save(Restaurant, {
        ...restaurant.entity,
        ...updateDto,
      });

      if (restaurantSaved) {
        this.activeCount++; // 새 레스토랑이 성공적으로 저장된 경우 activeCount를 증가시킵니다.
      }
    } catch (error) {
      // 오류가 발생하면 트랜잭션을 롤백하는 로직은 상위 컨텍스트에 맡깁니다.
      throw new Error(`레스토랑 데이터 트랜잭션 오류: ${error.message}`);
    }
  }

  private delayForNextBatch(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private validateAndFormatTelephone(telephone: string): string | null {
    const startsWith031 = telephone.startsWith('031');
    const startsWith032 = telephone.startsWith('032');
    const startsWith02 = telephone.startsWith('02');
    const startsWith070 = telephone.startsWith('070');
    const startsWith050 = telephone.startsWith('050');

    if (
      startsWith031 ||
      startsWith032 ||
      startsWith02 ||
      startsWith070 ||
      startsWith050
    ) {
      return telephone;
    } else {
      return `031${telephone}`;
    }
  }
}
