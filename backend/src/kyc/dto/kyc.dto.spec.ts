import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { CreateKycDto, UpdateAddressDto } from './kyc.dto';

describe('CreateKycDto (/kyc/submit, branché via validateInMode)', () => {
  const valid = {
    firstName: 'Jan',
    lastName: 'Batis',
    dateOfBirth: '1990-01-01',
    phoneNumber: '+50912345678',
    idType: 'PASSPORT',
    idNumber: 'AB123456',
    idImage: 'https://cdn.example.com/id.jpg',
    userPhoto: 'https://cdn.example.com/photo.jpg',
    line1: '123 rue Capois',
    city: 'Port-au-Prince',
    state: 'Ouest',
    zipCode: 'HT6110',
    country: 'Haiti',
  };

  it('aksepte yon payload valid', () => expectValid(CreateKycDto, valid));

  it('rejte yon dateOfBirth ki pa ISO8601', () =>
    expectInvalid(CreateKycDto, { ...valid, dateOfBirth: '01/01/1990' }));

  it('rejte yon firstName vid', () => expectInvalid(CreateKycDto, { ...valid, firstName: '' }));
});

describe('UpdateAddressDto (/kyc/address)', () => {
  it('aksepte yon payload valid (sèlman line1 obligatwa)', () =>
    expectValid(UpdateAddressDto, { line1: '456 rue Pavée' }));

  it('rejte yon line1 vid', () => expectInvalid(UpdateAddressDto, { line1: '' }));
});
