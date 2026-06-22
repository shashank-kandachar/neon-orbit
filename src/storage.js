const STATE_KEY = 'neon_orbit_stage1_state';
const PLANS_KEY = 'neon_orbit_stage1_saved_plans';
const IDEA_FEEDBACK_KEY = 'neon_orbit_stage1_idea_feedback';

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('Neon Orbit could not write local storage.', error);
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  return writeLocalStorage(STATE_KEY, JSON.stringify(state));
}

export function clearState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (error) {
    console.warn('Neon Orbit could not clear local storage.', error);
  }
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
  const withoutExisting = plans.filter((item) => item.id !== plan.id);
  const nextPlans = [plan, ...withoutExisting].slice(0, 50);
  if (!writeLocalStorage(PLANS_KEY, JSON.stringify(nextPlans))) {
    throw new Error('Could not save the section locally.');
  }
  return nextPlans;
}

export function removeSavedPlan(id) {
  const plans = loadSavedPlans().filter((item) => item.id !== id);
  writeLocalStorage(PLANS_KEY, JSON.stringify(plans));
  return plans;
}

export function loadIdeaFeedback() {
  try {
    const raw = localStorage.getItem(IDEA_FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveIdeaFeedback(feedback) {
  return writeLocalStorage(IDEA_FEEDBACK_KEY, JSON.stringify(feedback || {}));
}
