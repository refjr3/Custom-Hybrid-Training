import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AuthScreen from "../AuthScreen";
import Onboarding from "../Onboarding";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

const STORAGE_KEY = "onboarding_progress";

const BASE_PROGRESS = {
  step: 0,
  name: "",
  dob: "",
  age: "",
  weightLbs: "",
  heightFt: "",
  heightIn: "0",
  sex: null,
  raceGoals: [],
  noRace: false,
  races: [],
  lthr: "",
  deloadPref: null,
  supplements: [],
  whoopJustConnected: false,
  customSupps: [],
};

function seedProgress(overrides = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...BASE_PROGRESS, ...overrides }));
}

function makeSupabaseMock({
  signUpResult = { error: null },
  signInResult = { error: null },
  getSessionResult = { data: { session: { user: { id: "live-user-id" } } } },
  upsertResult = { data: { user_id: "live-user-id" }, error: null },
} = {}) {
  const signUp = vi.fn().mockResolvedValue(signUpResult);
  const signInWithPassword = vi.fn().mockResolvedValue(signInResult);
  const getSession = vi.fn().mockResolvedValue(getSessionResult);

  const single = vi.fn().mockResolvedValue(upsertResult);
  const select = vi.fn(() => ({ single }));
  const upsert = vi.fn(() => ({ select }));

  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn(() => ({ eq }));

  const from = vi.fn(() => ({ upsert, update }));

  return {
    auth: { signUp, signInWithPassword, getSession },
    from,
    __mocks: { signUp, signInWithPassword, getSession, upsert, select, single, update, eq },
  };
}

function renderAuth(supabase = makeSupabaseMock()) {
  render(React.createElement(AuthScreen, { supabase }));
  return { supabase };
}

function renderOnboarding({
  supabase = makeSupabaseMock(),
  session = { user: { id: "stale-session-prop-id" } },
  onComplete = vi.fn(),
} = {}) {
  render(React.createElement(Onboarding, { supabase, session, onComplete }));
  return { supabase, onComplete };
}

async function moveToRaceGoals(user) {
  await user.type(screen.getByPlaceholderText(/first name/i), "Alex");
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await screen.findByText(/STEP 3 OF 6/i);
}

async function moveToWearables(user) {
  await moveToRaceGoals(user);
  await user.click(screen.getByRole("button", { name: /HYROX/i }));
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await screen.findByText(/STEP 5 OF 6/i);
}

describe("Onboarding flow regression suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  describe("Authentication Tests", () => {
    it("1. New user can sign up with valid email", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock();
      renderAuth(supabase);

      await user.click(screen.getAllByRole("button", { name: /SIGN UP/i })[0]);
      await user.type(screen.getByPlaceholderText(/email address/i), "new@example.com");
      await user.type(screen.getByPlaceholderText(/^password$/i), "StrongPass123!");
      await user.click(screen.getByRole("button", { name: /CREATE ACCOUNT/i }));

      await waitFor(() =>
        expect(supabase.__mocks.signUp).toHaveBeenCalledWith({
          email: "new@example.com",
          password: "StrongPass123!",
        })
      );
    });

    it("2. OTP code is sent to email after signup", async () => {
      const user = userEvent.setup();
      renderAuth(makeSupabaseMock());

      await user.click(screen.getAllByRole("button", { name: /SIGN UP/i })[0]);
      await user.type(screen.getByPlaceholderText(/email address/i), "otp@example.com");
      await user.type(screen.getByPlaceholderText(/^password$/i), "StrongPass123!");
      await user.click(screen.getByRole("button", { name: /CREATE ACCOUNT/i }));

      expect(await screen.findByRole("button", { name: /BACK TO SIGN IN/i })).toBeInTheDocument();
      expect(screen.getByText(/otp@example.com/i)).toBeInTheDocument();
    });

    it.todo("3. Valid OTP code completes authentication");
    it.todo("4. Invalid OTP code shows error message");
    it.todo("5. Expired OTP code shows error message");

    it("6. Already registered email shows appropriate message", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock({
        signUpResult: { error: { message: "User already registered" } },
      });
      renderAuth(supabase);

      await user.click(screen.getAllByRole("button", { name: /SIGN UP/i })[0]);
      await user.type(screen.getByPlaceholderText(/email address/i), "existing@example.com");
      await user.type(screen.getByPlaceholderText(/^password$/i), "StrongPass123!");
      await user.click(screen.getByRole("button", { name: /CREATE ACCOUNT/i }));

      expect(await screen.findByText(/User already registered/i)).toBeInTheDocument();
    });
  });

  describe("Step 1 — Profile Tests", () => {
    it("7. Step 1 renders with name input and sport selector", async () => {
      const user = userEvent.setup();
      renderOnboarding();

      expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
      await moveToRaceGoals(user);
      expect(screen.getByRole("button", { name: /HYROX/i })).toBeInTheDocument();
    });

    it("8. Name field accepts text input", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      const name = screen.getByPlaceholderText(/first name/i);
      await user.type(name, "Jordan");
      expect(name).toHaveValue("Jordan");
    });

    it("9. At least one sport must be selected to proceed", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    });

    it("10. Multiple sports can be selected simultaneously", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);

      await user.click(screen.getByRole("button", { name: /HYROX/i }));
      await user.click(screen.getByRole("button", { name: /MARATHON/i }));

      expect(screen.getByText(/YOUR RACES/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /SET PRIMARY|★ PRIMARY/i })).toHaveLength(2);
    });

    it.todo("11. Experience level must be selected to proceed");

    it("12. NEXT button disabled until required fields filled", () => {
      renderOnboarding();
      expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    });

    it.todo("13. NEXT button enabled when name + sport + experience filled");
  });

  describe("Step 2 — Goals Tests", () => {
    it("14. One race entry appears per selected sport from Step 1", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      await user.click(screen.getByRole("button", { name: /HYROX/i }));
      await user.click(screen.getByRole("button", { name: /MARATHON/i }));
      expect(screen.getAllByRole("button", { name: /SET PRIMARY|★ PRIMARY/i })).toHaveLength(2);
    });

    it("15. Race name field accepts text input", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      await user.click(screen.getByRole("button", { name: /HYROX/i }));

      const raceNameInput = screen.getByPlaceholderText(/Search or type race name/i);
      await user.clear(raceNameInput);
      await user.type(raceNameInput, "HYROX Austin");
      expect(raceNameInput).toHaveValue("HYROX Austin");
    });

    it("16. Race date picker works correctly", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      await user.click(screen.getByRole("button", { name: /HYROX/i }));

      const dateInput = document.querySelector('input[type="date"]');
      fireEvent.change(dateInput, { target: { value: "2026-06-14" } });
      expect(dateInput).toHaveValue("2026-06-14");
    });

    it("17. \"No upcoming race\" checkbox hides race entry fields", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      await user.click(screen.getByRole("button", { name: /NO UPCOMING RACE/i }));
      expect(screen.queryByText(/YOUR RACES/i)).not.toBeInTheDocument();
    });

    it("18. Primary race toggle works — only one can be primary", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      await user.click(screen.getByRole("button", { name: /HYROX/i }));
      await user.click(screen.getByRole("button", { name: /MARATHON/i }));

      const toggles = screen.getAllByRole("button", { name: /SET PRIMARY|★ PRIMARY/i });
      await user.click(toggles[1]);
      expect(screen.getAllByRole("button", { name: /★ PRIMARY/i })).toHaveLength(1);
    });

    it.todo("19. Weekly training hours accepts numeric input only");

    it("20. Can proceed without race date (optional)", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await moveToRaceGoals(user);
      await user.click(screen.getByRole("button", { name: /HYROX/i }));
      await user.click(screen.getByRole("button", { name: /^next$/i }));
      expect(await screen.findByText(/STEP 4 OF 6/i)).toBeInTheDocument();
    });
  });

  describe("Step 3 — Body Metrics Tests", () => {
    it("21. Date of birth field accepts valid dates", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await user.type(screen.getByPlaceholderText(/first name/i), "Alex");
      await user.click(screen.getByRole("button", { name: /^next$/i }));

      const dobInput = document.querySelector('input[type="date"]');
      fireEvent.change(dobInput, { target: { value: "1990-01-15" } });
      expect(dobInput).toHaveValue("1990-01-15");
    });

    it.todo("22. Future dates are rejected for DOB");

    it("23. Age is auto-calculated from DOB", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await user.type(screen.getByPlaceholderText(/first name/i), "Alex");
      await user.click(screen.getByRole("button", { name: /^next$/i }));

      const dobInput = document.querySelector('input[type="date"]');
      fireEvent.change(dobInput, { target: { value: "2000-01-01" } });
      const ageInput = screen.getByPlaceholderText("32");
      await waitFor(() => expect(ageInput.value).not.toBe(""));
      expect(Number(ageInput.value)).toBeGreaterThan(0);
    });

    it("24. LTHR field accepts numeric input", async () => {
      const user = userEvent.setup();
      seedProgress({ step: 3, name: "Alex", noRace: true });
      renderOnboarding();
      const lthrInput = screen.getByPlaceholderText(/163/i);
      await user.type(lthrInput, "165");
      expect(lthrInput).toHaveValue(165);
    });

    it.todo("25. \"I don't know\" LTHR option sets default (180 - age)");

    it("26. Height and weight fields accept numeric input", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await user.type(screen.getByPlaceholderText(/first name/i), "Alex");
      await user.click(screen.getByRole("button", { name: /^next$/i }));

      const weightInput = screen.getByPlaceholderText("185");
      const feetInput = screen.getByPlaceholderText("5");
      const inchesInput = screen.getByPlaceholderText("10");
      await user.type(weightInput, "182");
      await user.type(feetInput, "5");
      await user.clear(inchesInput);
      await user.type(inchesInput, "11");

      expect(weightInput).toHaveValue(182);
      expect(feetInput).toHaveValue(5);
      expect(inchesInput).toHaveValue(11);
    });

    it("27. Sex selector works (M/F/X)", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await user.type(screen.getByPlaceholderText(/first name/i), "Alex");
      await user.click(screen.getByRole("button", { name: /^next$/i }));

      await user.click(screen.getByRole("button", { name: /^MALE$/i }));
      await user.click(screen.getByRole("button", { name: /^FEMALE$/i }));
      await user.click(screen.getByRole("button", { name: /^OTHER$/i }));
      expect(screen.getByRole("button", { name: /^OTHER$/i })).toBeInTheDocument();
    });

    it("28. All fields optional — can proceed empty", async () => {
      const user = userEvent.setup();
      renderOnboarding();
      await user.type(screen.getByPlaceholderText(/first name/i), "Alex");
      await user.click(screen.getByRole("button", { name: /^next$/i }));
      await user.click(screen.getByRole("button", { name: /^next$/i }));
      expect(await screen.findByText(/STEP 3 OF 6/i)).toBeInTheDocument();
    });
  });

  describe("Step 4 — Wearables Tests", () => {
    it.todo("29. WHOOP connect button redirects to OAuth");

    it("30. After WHOOP OAuth, returns to Step 4 (not Step 1)", async () => {
      seedProgress({ step: 0, name: "Alex" });
      localStorage.setItem("onboarding_whoop_redirect", "true");
      renderOnboarding();
      expect(await screen.findByText(/STEP 5 OF 6/i)).toBeInTheDocument();
    });

    it("31. Connected WHOOP shows green checkmark", async () => {
      seedProgress({ step: 4, name: "Alex", whoopJustConnected: true });
      renderOnboarding();
      expect(await screen.findByText(/CONNECTED ✓/i)).toBeInTheDocument();
    });

    it("32. WHOOP stays connected if user goes back and forward", async () => {
      const user = userEvent.setup();
      seedProgress({ step: 4, name: "Alex", whoopJustConnected: true });
      renderOnboarding();
      await user.click(screen.getByRole("button", { name: /BACK/i }));
      await user.click(screen.getByRole("button", { name: /^NEXT$/i }));
      expect(await screen.findByText(/CONNECTED ✓/i)).toBeInTheDocument();
    });

    it.todo("33. Garmin shows SOON badge (not clickable)");
    it.todo("34. Oura shows SOON badge (not clickable)");

    it("35. SKIP / CONTINUE works without connecting anything", async () => {
      const user = userEvent.setup();
      seedProgress({ step: 4, name: "Alex", noRace: true });
      renderOnboarding();
      await user.click(screen.getByRole("button", { name: /^NEXT$/i }));
      expect(await screen.findByText(/STEP 6 OF 6/i)).toBeInTheDocument();
    });

    it("36. Health data upload button opens file picker", async () => {
      const user = userEvent.setup();
      seedProgress({ step: 4, name: "Alex", noRace: true });
      renderOnboarding();
      await user.click(screen.getByRole("button", { name: /^UPLOAD$/i }));

      const fileInput = document.querySelector('input[type="file"][accept="image/*,.pdf"]');
      const file = new File(["lab-data"], "labs.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(await screen.findByText(/labs\.pdf/i)).toBeInTheDocument();
    });

    it("37. Supplement input accepts text", async () => {
      const user = userEvent.setup();
      seedProgress({ step: 4, name: "Alex", noRace: true });
      renderOnboarding();
      await user.click(screen.getByRole("button", { name: /^ADD$/i }));
      const customInput = screen.getByPlaceholderText(/Creatine 5g/i);
      await user.type(customInput, "Fish Oil");
      await user.click(screen.getByRole("button", { name: /^\+$/i }));
      expect(await screen.findByText(/Fish Oil/i)).toBeInTheDocument();
    });
  });

  describe("Step 5 — Plan Structure Tests", () => {
    it.todo("38. Weeks per block selector works (4/6/8/12)");
    it.todo("39. Phases selector works (2/3/4/6)");
    it.todo("40. Deload preference selector works");
    it.todo("41. Selection persists if user goes back then forward");
    it.todo("42. BUILD MY PLAN button enabled after selections made");
  });

  describe("Step 6 — Plan Generation Tests", () => {
    it("43. Loading screen appears when BUILD MY PLAN is tapped", async () => {
      const user = userEvent.setup();
      let resolveUpsert;
      const pendingUpsert = new Promise((resolve) => { resolveUpsert = resolve; });
      const supabase = makeSupabaseMock({ upsertResult: pendingUpsert });
      const onComplete = vi.fn();
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({ supabase, onComplete });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      expect(screen.getByRole("button", { name: /SAVING/i })).toBeInTheDocument();

      resolveUpsert({ data: { user_id: "live-user-id" }, error: null });
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
    });

    it.todo("44. API call is made to /api/plan/generate");

    it("45. user_profiles row is created with correct user_id", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock({
        getSessionResult: { data: { session: { user: { id: "live-auth-user" } } } },
      });
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({ supabase });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      await waitFor(() =>
        expect(supabase.__mocks.upsert).toHaveBeenCalledWith(
          expect.objectContaining({ user_id: "live-auth-user" }),
          expect.anything()
        )
      );
    });

    it.todo("46. generation_status is set to \"in_progress\" during generation");
    it.todo("47. generation_status is set to \"complete\" on success");
    it.todo("48. generation_status is set to \"failed\" on error");

    it("49. On success, user is taken into the app", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({ supabase: makeSupabaseMock(), onComplete });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    });

    it.todo("50. On failure, TRY AGAIN button appears");
    it.todo("51. Retry clears partial data and regenerates from scratch");
    it.todo("52. Plan is seeded with correct number of weeks based on race date");
    it.todo("53. training_blocks, training_weeks, training_days all populated");

    it("54. Foreign key constraint not violated on user_profiles insert", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock({
        getSessionResult: { data: { session: { user: { id: "fresh-session-user" } } } },
      });
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({
        supabase,
        session: { user: { id: "stale-prop-user" } },
      });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      await waitFor(() =>
        expect(supabase.__mocks.upsert).toHaveBeenCalledWith(
          expect.objectContaining({ user_id: "fresh-session-user" }),
          expect.anything()
        )
      );
    });
  });

  describe("Data Persistence Tests", () => {
    it("55. Onboarding progress saved in localStorage", async () => {
      const user = userEvent.setup();
      renderOnboarding();

      await user.type(screen.getByPlaceholderText(/first name/i), "Taylor");
      await user.click(screen.getByRole("button", { name: /^next$/i }));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(saved.name).toBe("Taylor");
    });

    it("56. Refreshing page mid-onboarding resumes at correct step", async () => {
      seedProgress({ step: 2, name: "Alex", noRace: true });
      renderOnboarding();
      expect(await screen.findByText(/STEP 3 OF 6/i)).toBeInTheDocument();
    });

    it("57. WHOOP OAuth redirect preserves onboarding step", async () => {
      seedProgress({ step: 2, name: "Alex", noRace: true });
      localStorage.setItem("onboarding_whoop_redirect", "true");
      renderOnboarding();
      expect(await screen.findByText(/STEP 5 OF 6/i)).toBeInTheDocument();
    });

    it.todo("58. Completed onboarding never shows again for same user");
    it.todo("59. New user always sees onboarding first");
    it.todo("60. Deleted user_profiles row triggers onboarding again");
  });

  describe("Error State Tests", () => {
    it.todo("61. Network error during plan generation shows user-friendly message");

    it("62. Supabase error shows user-friendly message", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock({
        upsertResult: { data: null, error: { message: "Temporary database outage" } },
      });
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({ supabase });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      expect(await screen.findByText(/Temporary database outage/i)).toBeInTheDocument();
    });

    it("63. Foreign key violation shows \"try signing in again\" message", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock({
        upsertResult: {
          data: null,
          error: { message: "insert or update on table user_profiles violates foreign key constraint user_profiles_user_id_fkey" },
        },
      });
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({ supabase });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      expect(await screen.findByText(/Account setup failed — please try signing in again/i)).toBeInTheDocument();
    });

    it("64. Session expired mid-onboarding shows re-auth prompt", async () => {
      const user = userEvent.setup();
      const supabase = makeSupabaseMock({
        getSessionResult: { data: { session: null } },
      });
      seedProgress({ step: 5, name: "Alex", noRace: true });
      renderOnboarding({ supabase });

      await user.click(screen.getByRole("button", { name: /LET'S GO/i }));
      expect(await screen.findByText(/Account setup failed — please try signing in again/i)).toBeInTheDocument();
    });

    it.todo("65. All error states have recovery actions (retry/back/sign in)");
  });
});
