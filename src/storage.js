const STATE_KEY = 'neon_orbit_stage1_state';
const PLANS_KEY = 'neon_orbit_stage1_saved_plans';

export function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STATE_KEY);
}

export function loadSavedPlans() {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlanSnapshot(plan) {
  const plans = loadSavedPlans();
  plans.unshift(plan);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans.slice(0, 50)));
  return plans;
}

export function removeSavedPlan(id) {
  const plans = loadSavedPlans().filter((item) => item.id !== id);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  return plans;
}
