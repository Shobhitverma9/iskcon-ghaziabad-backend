import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PoojaService } from './pooja.service';
import { PoojaBooking } from './schemas/pooja.schema';
import { PujaItem } from './schemas/puja-item.schema';
import { User } from '../auth/schemas/user.schema';
import { NotificationService } from '../notification/notification.service';

describe('PoojaService', () => {
    let service: PoojaService;

    // Mock implementations for Mongoose queries
    const mockPoojaBookingModel = {
        find: jest.fn().mockReturnThis(),
        findById: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    const mockPujaItemModel = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    const mockUserModel = {
        findById: jest.fn(),
    };

    const mockCacheManager = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    };

    const mockNotificationService = {
        sendEmail: jest.fn(),
        sendWhatsapp: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PoojaService,
                { provide: getModelToken(PoojaBooking.name), useValue: mockPoojaBookingModel },
                { provide: getModelToken(PujaItem.name), useValue: mockPujaItemModel },
                { provide: getModelToken(User.name), useValue: mockUserModel },
                { provide: CACHE_MANAGER, useValue: mockCacheManager },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compile();

        service = module.get<PoojaService>(PoojaService);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findById Optimization', () => {
        it('should query MongoDB using .lean() for performance if not cached', async () => {
            const mockResult = { _id: '123', deviseName: 'Test' };

            // Simulate cache miss
            mockCacheManager.get.mockResolvedValueOnce(null);
            // Simulate MongoDB returning data after lean().exec()
            mockPoojaBookingModel.exec.mockResolvedValueOnce(mockResult);

            const result = await service.findById('123');

            // Verify execution chain for optimization
            expect(mockCacheManager.get).toHaveBeenCalledWith('pooja:123');
            expect(mockPoojaBookingModel.findById).toHaveBeenCalledWith('123');
            expect(mockPoojaBookingModel.lean).toHaveBeenCalled();
            expect(mockPoojaBookingModel.exec).toHaveBeenCalled();

            // Verify result
            expect(result).toEqual(mockResult);
        });
    });

    describe('getAvailableSlots', () => {
        it('should use .lean() query to calculate available slots for the date', async () => {
            const testDate = new Date('2026-05-15T00:00:00Z');

            // Simulate cache miss
            mockCacheManager.get.mockResolvedValueOnce(null);
            // Simulate 1 booked slot out of standard pool
            mockPoojaBookingModel.exec.mockResolvedValueOnce([{
                poojaDate: new Date('2026-05-15T06:00:00Z')
            }]);

            const slots = await service.getAvailableSlots(testDate);

            // Verify optimization logic used .lean()
            expect(mockPoojaBookingModel.find).toHaveBeenCalledWith(expect.objectContaining({
                status: 'confirmed'
            }));
            expect(mockPoojaBookingModel.lean).toHaveBeenCalled();
            expect(mockPoojaBookingModel.exec).toHaveBeenCalled();

            // Check cache storage execution works
            expect(mockCacheManager.set).toHaveBeenCalled();
            expect(slots.length).toBeGreaterThan(0);
        });
    });
});
