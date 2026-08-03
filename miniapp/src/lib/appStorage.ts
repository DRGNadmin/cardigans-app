/** Смена версии сбрасывает показ Terms для всех (однократно). */
export const STORAGE_TERMS = "cg_terms_accepted_v8";
export const STORAGE_ONBOARDING = "cg_onboarding_done_v3";

export function isTermsAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_TERMS) === "1";
  } catch {
    return false;
  }
}

export function setTermsAccepted(): void {
  try {
    localStorage.setItem(STORAGE_TERMS, "1");
  } catch {
    /* private mode */
  }
}

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_ONBOARDING) === "1";
  } catch {
    return false;
  }
}

export function setOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_ONBOARDING, "1");
  } catch {
    /* private mode */
  }
}

/** Сброс Terms + онбординга (для теста: `?reset=1` в URL). */
export function resetWelcomeFlow(): void {
  try {
    localStorage.removeItem(STORAGE_TERMS);
    localStorage.removeItem(STORAGE_ONBOARDING);
  } catch {
    /* private mode */
  }
}
