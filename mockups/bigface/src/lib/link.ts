import { toHash, type MockState, type Screen } from "./state";

// Hash link to another view. Every screen can be opened from its URL.
export function viewHref(s: MockState, screen: Screen, id = ""): string {
  return toHash({ ...s, screen, id });
}
