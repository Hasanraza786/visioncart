import {guestsApi} from '../api_services';
import {useGuestStore} from '../store';

/**
 * After successful Login/Register, merge any guest try-on history into the
 * authenticated account, then clear the local guest key.
 */
export async function mergeGuestAfterAuth(): Promise<void> {
  const guestKey = useGuestStore.getState().guestKey;
  if (!guestKey) {
    return;
  }

  try {
    const idempotencyKey = `merge-${guestKey}`.slice(0, 64);
    await guestsApi.mergeGuest({
      guest_key: guestKey,
      idempotency_key: idempotencyKey,
    });
  } catch {
    // Best-effort: session is already established even if merge fails.
  }

  useGuestStore.getState().clearGuest();
}
