export function canVerifyEntryFee(input: {
  verifierId: string;
  verifierTenantId: string | null;
  canVerify: boolean;
  feeTenantId: string;
  payerId: string;
  sellerId: string;
}): boolean {
  return (
    input.canVerify &&
    input.verifierId !== input.payerId &&
    input.verifierId !== input.sellerId &&
    (input.verifierTenantId === null ||
      input.verifierTenantId === input.feeTenantId)
  );
}
