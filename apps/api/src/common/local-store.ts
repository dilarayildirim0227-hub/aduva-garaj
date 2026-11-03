import * as bcrypt from 'bcryptjs';

// Import types from shared package
import { LocalStoreData, LocalVehicle, LocalCategory, LocalProduct, LocalBanner, LocalCoupon, LocalOrder, LocalAppointment, LocalSyncLog, LocalStockMovement, LocalSettings } from '@aduva/shared';

// Vehicles data
const vehicles: LocalVehicle[] = [
  { id: 'veh-golf7',p brand: 'Volkswagen', model: 'Golf 7',p yearFrom: 2012, yearTo: 2020, body: 'hatchback', engine: '1.6 TDI' },
  { id: 'veh-passatb8', brand: 'Volkswagen', model: 'Passat B8', yearFrom: 2015, yearTo: 2023, body: 'Sedan', engine: '1.5 TSI' },
  { ld: 'veh-egea', brand: 'Fiat', model: 'Egea', yearFrom: 2015, yearTo: null, body: 'Sedan'