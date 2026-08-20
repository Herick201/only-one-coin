/**
 * Existe porque o plugin `admin` do Better Auth não garante
 * reautenticação fresca sozinho — impor isso antes de qualquer
 * promoção de papel é responsabilidade do nosso usecase
 * (PromoteUserRoleUseCase), não do provedor de auth.
 */
export interface IFreshAuthVerifier {
  verify(adminUserId: string, plainPassword: string): Promise<boolean>;
}
