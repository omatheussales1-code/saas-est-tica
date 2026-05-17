# Security Specification - OrbyFlow

## Data Invariants
1. **Ownership**: Every document must have an `ownerId` that matches the creator's `uid`.
2. **Relational Integrity**: 
   - Appointments must point to a valid Client and Procedure owned by the same user.
   - Budgets must point to a valid Client owned by the same user.
   - Financial Entries linked to an appointment must match the appointment's owner.
3. **Immutability**: `ownerId` and `createdAt` fields must never change after creation.
4. **UserProfile Singleton**: A user can only manage their own profile, which must be stored at `/userProfiles/{userId}`.

## The Dirty Dozen Payloads (Attack Vectors)

1. **Identity Theft (Create)**: Attempt to create a client with `ownerId` set to a different user's UID.
2. **Identity Theft (Update)**: Attempt to change the `ownerId` of an existing client to take over ownership or bypass filters.
3. **PII Scraping**: Attempt to list all `userProfiles` or `clients` without being an admin or the respective owner.
4. **Ghost Field Injection**: Attempt to create a `UserProfile` with an extra `isAdmin: true` field to escalate privileges.
5. **ID Poisoning**: Attempt to create a document with a 1MB string as the ID to cause resource exhaustion or bypass ID validation.
6. **Relational Orphan**: Create an `Appointment` for a `clientId` that does not exist or belongs to another user.
7. **Temporal Fraud**: Set `createdAt` to a date in the past or future instead of `request.time`.
8. **State Shortcut**: Update an `Appointment` status directly from 'pendente' to 'realizado' without passing through intermediate logic (if applicable, though rules here focus on data integrity).
9. **Negative Financials**: Create a `FinancialEntry` with a negative `amount` when not allowed (though amount should be validated).
10. **Shadow Profile**: Create a `userProfile` for another user's UID.
11. **Denial of Wallet**: Infinite sized arrays or strings in `Budget` items.
12. **Unverified Sabotage**: Perform write operations with an unverified email account (if strict verification is enforced).

## Test Runner Plan
The `firestore.rules.test.ts` will verify:
- Unauthorized users can read/write nothing.
- Authorized users can only read/write their own data.
- Admins can perform necessary overrides.
- Schema validation prevents shadow fields and invalid types.
