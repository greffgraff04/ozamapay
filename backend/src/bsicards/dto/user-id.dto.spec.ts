import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { UserIdDto } from './user-id.dto';

describe('UserIdDto (/admin/bsicards/create-card, /block, /unblock, mastercard-usd/create-card)', () => {
  it('aksepte yon UUID valid', () =>
    expectValid(UserIdDto, { userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }));

  it('rejte yon userId ki pa yon UUID', () => expectInvalid(UserIdDto, { userId: 'pa-yon-uuid' }));
});
