import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listingApi } from "../../lib/listing-api";
import { K } from "../../constants/theme";
import { ALL_COUNTRIES, CountryData } from "../../constants/countries";
import { ALL_CURRENCIES } from "../../lib/currency";
import {
  FormField,
  SectionHeader,
  InfoBanner,
  PayoutCurrencyWarning,
  SwitchRow,
  SelectField,
  CountryPickerButton,
  CountryPickerModal,
  PhotosSection,
  DocumentsSection,
  WizardHeader,
  WizardFooter,
} from "./_components";
import { LocationPicker } from "../../components/maps/LocationPicker";
import { useListingMedia } from "./_media";
import { useAuthStore } from "../../store/auth";
import {
  CANCELLATION_POLICIES,
  toNullableNumber,
  toNullableInt,
  trimOrNull,
  countryOrNull,
  apiErrorMessage,
  getCurrencyForCountry,
} from "./_web-parity";

/**
 * Car listing wizard — mirror of the provider web app's CarForm.
 *
 * Steps, fields, option lists, value normalisers, validation and the payload
 * builder are ports of `apps/web/.../_forms/CarForm.tsx`; only the rendering
 * is native. Every save PATCHes the FULL payload, exactly as web does.
 */

// ── Option lists — ports of web CarForm constants ───────────────────────────

const CAR_CATEGORIES = [
  { value: "Economy", label: "Economy" },
  { value: "Compact", label: "Compact" },
  { value: "SUV", label: "SUV" },
  { value: "Minivan", label: "Minivan" },
  { value: "Pickup", label: "Pickup" },
  { value: "Luxury", label: "Luxury" },
  { value: "Electric", label: "Electric" },
  { value: "Convertible", label: "Convertible" },
];

const TRANSMISSION_OPTIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
  { value: "semi_auto", label: "Semi-Automatic" },
];

const FUEL_TYPE_OPTIONS = [
  { value: "petrol", label: "Petrol / Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "lpg", label: "LPG" },
];

// Backend accepts: "2WD" | "4WD" | "AWD"
const DRIVE_TYPE_OPTIONS = [
  { value: "2WD", label: "Two-Wheel Drive (2WD)" },
  { value: "4WD", label: "Four-Wheel Drive (4WD)" },
  { value: "AWD", label: "All-Wheel Drive (AWD)" },
];

const MILEAGE_POLICY_OPTIONS = [
  { value: "unlimited", label: "Unlimited Mileage" },
  { value: "limited", label: "Limited Mileage" },
];

const FUEL_POLICY_OPTIONS = [
  { value: "full_to_full", label: "Full to Full" },
  { value: "full_to_empty", label: "Full to Empty" },
  { value: "pre_purchase", label: "Pre-purchase" },
];

const INSURANCE_TYPE_OPTIONS = [
  { value: "basic_third_party", label: "Basic Third Party" },
  { value: "comprehensive", label: "Comprehensive" },
  { value: "premium_zero_excess", label: "Premium Zero Excess" },
];

const CAR_CATEGORY_VALUES = new Set(CAR_CATEGORIES.map((x) => x.value));
const TRANSMISSION_VALUES = new Set(TRANSMISSION_OPTIONS.map((x) => x.value));
const FUEL_TYPE_VALUES = new Set(FUEL_TYPE_OPTIONS.map((x) => x.value));
const MILEAGE_POLICY_VALUES = new Set(MILEAGE_POLICY_OPTIONS.map((x) => x.value));
const FUEL_POLICY_VALUES = new Set(FUEL_POLICY_OPTIONS.map((x) => x.value));
const INSURANCE_TYPE_VALUES = new Set(INSURANCE_TYPE_OPTIONS.map((x) => x.value));
const CANCELLATION_POLICY_VALUES = new Set(CANCELLATION_POLICIES.map((x) => x.value));

const CAR_DOCS = [
  { key: "vehicle_registration", label: "Vehicle Registration", icon: "file-text" as const },
  { key: "insurance_certificate", label: "Insurance Certificate", icon: "shield" as const },
  { key: "roadworthiness_certificate", label: "Roadworthiness Certificate", icon: "check-circle" as const },
];

const STEPS = [
  "Identity & Classification",
  "Technical Specs",
  "Rental Terms & Insurance",
  "Media & Documents",
] as const;

const STEP_HINTS = [
  "Basic info & pickup location",
  "Features",
  "Pricing & terms",
  "Photos (min 3 required) & documents",
] as const;

const currentYear = new Date().getFullYear();

// ── State — port of web CarState ────────────────────────────────────────────

type CarState = {
  name: string;
  description: string;
  carMake: string;
  carModel: string;
  carYear: string;
  carCategory: string;
  licencePlate: string;
  odometerReading: string;
  unitCount: string;
  colour: string;
  engineSize: string;
  minimumRentalDays: string;
  address: string;
  lat: number | null;
  lng: number | null;
  town: string;
  neighborhood: string;
  country: string;
  transmission: string;
  fuelType: string;
  driveType: string;
  seats: string;
  doors: string;
  airConditioning: boolean;
  pricePerDay: string;
  currency: string;
  pickupHoursFrom: string;
  pickupHoursTo: string;
  cancellationPolicy: string;
  mileagePolicy: string;
  mileageLimitKm: string;
  extraKmRate: string;
  fuelPolicy: string;
  insuranceType: string;
  minimumDriverAge: string;
  securityDeposit: string;
  deliveryEnabled: boolean;
  deliveryRadiusKm: string;
  deliveryFee: string;
  allowPreBooking: boolean;
  roadsideAssistance: boolean;
  crossBorderAllowed: boolean;
  driverProvided: boolean;
  airportPickup: boolean;
  returnSameLocation: boolean;
};

type FormErrors = Partial<Record<keyof CarState | "photos" | "documents", string>>;

// ── Normalisers — ports of the web CarForm helpers ──────────────────────────

function normalizeSelectValue(v: unknown, allowed: Set<string>, fallback: string): string {
  if (typeof v !== "string") return fallback;
  return allowed.has(v) ? v : fallback;
}

function normalizeTransmission(v: unknown): string {
  if (typeof v !== "string") return "automatic";
  const normalized = v.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "semi_automatic") return "semi_auto";
  return normalizeSelectValue(normalized, TRANSMISSION_VALUES, "automatic");
}

function normalizeFuelType(v: unknown): string {
  if (typeof v !== "string") return "petrol";
  const normalized = v.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "gasoline" || normalized === "gas" || normalized === "supercharged_v8") return "petrol";
  if (normalized === "premium_hybrid" || normalized === "diesel_hybrid") return "hybrid";
  if (normalized === "100%_electric") return "electric";
  return normalizeSelectValue(normalized, FUEL_TYPE_VALUES, "petrol");
}

function normalizeDriveType(v: unknown): string {
  if (typeof v !== "string") return "2WD";
  const normalized = v.toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "4WD" || normalized === "FOUR_WD") return "4WD";
  if (normalized === "AWD") return "AWD";
  return "2WD";
}

function initState(l: any): CarState {
  return {
    name: l?.name ?? "",
    description: l?.description ?? "",
    carMake: l?.carMake ?? "",
    carModel: l?.carModel ?? "",
    carYear: l?.carYear ? String(l.carYear) : String(currentYear),
    carCategory: normalizeSelectValue(l?.carCategory, CAR_CATEGORY_VALUES, "Economy"),
    licencePlate: l?.licencePlate ?? "",
    odometerReading: l?.odometerReading != null ? String(l.odometerReading) : "",
    unitCount: l?.unitCount ? String(l.unitCount) : "1",
    colour: l?.colour ?? "",
    engineSize: l?.engineSize ?? "",
    minimumRentalDays: l?.minimumRentalDays != null ? String(l.minimumRentalDays) : "1",
    address: l?.address ?? "",
    lat: toNullableNumber(l?.lat),
    lng: toNullableNumber(l?.lng),
    town: l?.town ?? "",
    neighborhood: l?.neighborhood ?? "",
    country: l?.country ?? "",
    transmission: normalizeTransmission(l?.transmission),
    fuelType: normalizeFuelType(l?.fuelType),
    driveType: normalizeDriveType(l?.driveType),
    seats: l?.seats ? String(l.seats) : "5",
    doors: l?.doors ? String(l.doors) : "4",
    airConditioning: l?.airConditioning ?? true,
    pricePerDay: l?.pricePerDay ? String(l.pricePerDay) : "",
    currency: l?.currency ?? "USD",
    pickupHoursFrom: l?.pickupHoursFrom ?? "",
    pickupHoursTo: l?.pickupHoursTo ?? "",
    cancellationPolicy: normalizeSelectValue(l?.cancellationPolicy, CANCELLATION_POLICY_VALUES, "flexible"),
    mileagePolicy: normalizeSelectValue(l?.mileagePolicy, MILEAGE_POLICY_VALUES, "unlimited"),
    mileageLimitKm: l?.mileageLimitKm != null ? String(l.mileageLimitKm) : "",
    extraKmRate: l?.extraKmRate != null ? String(l.extraKmRate) : "",
    fuelPolicy: normalizeSelectValue(l?.fuelPolicy, FUEL_POLICY_VALUES, "full_to_full"),
    insuranceType: normalizeSelectValue(l?.insuranceType, INSURANCE_TYPE_VALUES, "standard"),
    minimumDriverAge: l?.minimumDriverAge != null ? String(l.minimumDriverAge) : "21",
    securityDeposit: l?.securityDeposit != null ? String(l.securityDeposit) : "",
    deliveryEnabled: l?.deliveryEnabled ?? false,
    deliveryRadiusKm: l?.deliveryRadiusKm != null ? String(l.deliveryRadiusKm) : "",
    deliveryFee: l?.deliveryFee != null ? String(l.deliveryFee) : "",
    allowPreBooking: l?.allowPreBooking ?? false,
    roadsideAssistance: l?.roadsideAssistance ?? false,
    crossBorderAllowed: l?.crossBorderAllowed ?? false,
    driverProvided: l?.driverProvided ?? false,
    airportPickup: l?.airportPickup ?? false,
    returnSameLocation: l?.returnSameLocation ?? true,
  };
}

// ── Payload — port of web buildPayload (full payload every save) ────────────

function buildPayload(s: CarState): Record<string, unknown> {
  const p: Record<string, unknown> = {};

  p.name = s.name.trim();
  p.description = trimOrNull(s.description);
  p.carMake = trimOrNull(s.carMake);
  p.carModel = trimOrNull(s.carModel);
  const year = toNullableInt(s.carYear);
  p.carYear = year !== null && year >= 1990 && year <= currentYear ? year : null;
  p.carCategory = normalizeSelectValue(s.carCategory, CAR_CATEGORY_VALUES, "Economy");
  p.licencePlate = trimOrNull(s.licencePlate.toUpperCase());
  const odometer = toNullableInt(s.odometerReading);
  p.odometerReading = odometer !== null && odometer >= 0 ? odometer : null;
  const units = toNullableInt(s.unitCount);
  if (units !== null && units >= 1) p.unitCount = units;

  p.address = trimOrNull(s.address);
  p.lat = toNullableNumber(s.lat);
  p.lng = toNullableNumber(s.lng);
  p.town = trimOrNull(s.town);
  p.neighborhood = trimOrNull(s.neighborhood);
  p.country = countryOrNull(s.country);

  p.colour = trimOrNull(s.colour);
  p.engineSize = trimOrNull(s.engineSize);
  const minRentalDays = toNullableInt(s.minimumRentalDays);
  p.minimumRentalDays = minRentalDays !== null && minRentalDays >= 1 ? minRentalDays : null;

  p.transmission = normalizeTransmission(s.transmission);
  p.fuelType = normalizeFuelType(s.fuelType);

  // Always send the backend enum (2WD/4WD/AWD).
  const _driveType = normalizeDriveType(s.driveType);
  if (_driveType) p.driveType = _driveType;

  const seats = toNullableInt(s.seats);
  p.seats = seats !== null && seats >= 1 ? seats : null;
  const doors = toNullableInt(s.doors);
  p.doors = doors !== null && doors >= 2 ? doors : null;
  p.airConditioning = s.airConditioning;

  const price = toNullableNumber(s.pricePerDay);
  if (price !== null && price > 0) p.pricePerDay = price;
  if (s.currency) p.currency = s.currency;
  if (CANCELLATION_POLICY_VALUES.has(s.cancellationPolicy)) p.cancellationPolicy = s.cancellationPolicy;
  p.mileagePolicy = normalizeSelectValue(s.mileagePolicy, MILEAGE_POLICY_VALUES, "unlimited");

  if (s.mileagePolicy === "limited") {
    const limit = toNullableInt(s.mileageLimitKm);
    p.mileageLimitKm = limit !== null && limit >= 1 ? limit : null;
    const rate = toNullableNumber(s.extraKmRate);
    p.extraKmRate = rate !== null && rate >= 0 ? rate : null;
  } else {
    p.mileageLimitKm = null;
    p.extraKmRate = null;
  }

  p.fuelPolicy = normalizeSelectValue(s.fuelPolicy, FUEL_POLICY_VALUES, "full_to_full");
  p.insuranceType = normalizeSelectValue(s.insuranceType, INSURANCE_TYPE_VALUES, "standard");
  const age = toNullableInt(s.minimumDriverAge);
  p.minimumDriverAge = age !== null && age >= 16 && age <= 100 ? age : null;
  const deposit = toNullableNumber(s.securityDeposit);
  p.securityDeposit = deposit !== null && deposit >= 0 ? deposit : null;

  p.allowPreBooking = s.allowPreBooking;
  p.deliveryEnabled = s.deliveryEnabled;
  if (s.deliveryEnabled) {
    const radius = toNullableInt(s.deliveryRadiusKm);
    p.deliveryRadiusKm = radius !== null && radius >= 0 ? radius : null;
    const fee = toNullableNumber(s.deliveryFee);
    p.deliveryFee = fee !== null && fee >= 0 ? fee : null;
  } else {
    p.deliveryRadiusKm = null;
    p.deliveryFee = null;
  }

  p.roadsideAssistance = s.roadsideAssistance;
  p.crossBorderAllowed = s.crossBorderAllowed;
  p.driverProvided = s.driverProvided;
  p.airportPickup = s.airportPickup;
  p.returnSameLocation = s.returnSameLocation;
  p.pickupHoursFrom = s.pickupHoursFrom || null;
  p.pickupHoursTo = s.pickupHoursTo || null;

  return p;
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function CarWizard() {
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  const listingId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";

  const qc = useQueryClient();
  const providerCountry = useAuthStore((st) => st.user?.country);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [isKeyboardOpen, setKeyboardOpen] = useState(false);

  const [form, setForm] = useState<CarState>(() => initState({}));

  const media = useListingMedia(listingId);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      const res = await listingApi.get<{ data: any }>(`/listings/${listingId}`);
      return res.data.data;
    },
    enabled: !!listingId,
  });

  const status = listing?.status ?? "draft";

  // Hydrate once per listing load; re-hydrating on every refetch would wipe
  // unsaved edits mid-wizard.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!listing || hydratedRef.current) return;
    hydratedRef.current = true;
    setForm(initState(listing));
    setSelectedCountry(ALL_COUNTRIES.find((c) => c.code === listing.country) ?? null);
    media.seed(listing.photos ?? [], listing.documents ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (step > 0) {
        setStep((s) => s - 1);
        return true;
      }
      handleExit();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function set<Key extends keyof CarState>(key: Key, value: CarState[Key]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof FormErrors]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function selectCountry(c: CountryData) {
    setSelectedCountry(c);
    set("country", c.code);
    const detectedCurrency = getCurrencyForCountry(c.code);
    if (detectedCurrency) {
      set("currency", detectedCurrency);
    }
  }

  // ── Validation — port of web validateStep ─────────────────────────────────

  function validateStep(idx: number): boolean {
    const e: FormErrors = {};
    switch (idx) {
      case 0: // Identity & classification
        if (!form.name.trim()) e.name = "Listing title is required.";
        if (!form.carMake.trim()) e.carMake = "Vehicle make is required.";
        if (!form.carModel.trim()) e.carModel = "Vehicle model is required.";
        if (!(Number(form.carYear) >= 1990 && Number(form.carYear) <= currentYear))
          e.carYear = `Vehicle year must be 1990–${currentYear}.`;
        if (!form.carCategory) e.carCategory = "Vehicle category is required.";
        if (!form.licencePlate.trim()) e.licencePlate = "Licence plate is required.";
        if (form.odometerReading === "") e.odometerReading = "Odometer reading is required.";
        if (!form.address.trim()) e.address = "Pickup address is required.";
        break;
      case 1: // Technical specs
        if (!form.transmission) e.transmission = "Transmission type is required.";
        if (!form.fuelType) e.fuelType = "Fuel type is required.";
        if (!form.driveType) e.driveType = "Drive type is required.";
        if (!(Number(form.seats) >= 1)) e.seats = "Seats must be at least 1.";
        if (!(Number(form.doors) >= 2)) e.doors = "Doors must be at least 2.";
        break;
      case 2: // Rental terms & insurance
        if (!(Number(form.pricePerDay) > 0)) e.pricePerDay = "Daily rate must be greater than 0.";
        if (!form.currency) e.currency = "Currency is required.";
        if (form.minimumRentalDays !== "" && Number(form.minimumRentalDays) < 1)
          e.minimumRentalDays = "Minimum rental days must be at least 1.";
        if (!form.cancellationPolicy) e.cancellationPolicy = "Cancellation policy is required.";
        if (!form.mileagePolicy) e.mileagePolicy = "Mileage policy is required.";
        if (form.mileagePolicy === "limited" && !form.mileageLimitKm)
          e.mileageLimitKm = "Mileage limit is required for limited mileage.";
        if (!form.fuelPolicy) e.fuelPolicy = "Fuel policy is required.";
        if (!form.insuranceType) e.insuranceType = "Insurance type is required.";
        if (form.deliveryEnabled && !form.deliveryRadiusKm)
          e.deliveryRadiusKm = "Delivery radius is required when delivery is enabled.";
        if (form.pickupHoursFrom && form.pickupHoursTo && form.pickupHoursFrom >= form.pickupHoursTo)
          e.pickupHoursFrom = "Pickup hours must be valid and end after start.";
        break;
      case 3: // Media & Documents
        if (media.photos.length < 3) e.photos = "At least 3 photos are required to activate your listing.";
        break;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Save — full payload each time, exactly as web does ───────────────────

  async function saveAll(): Promise<boolean> {
    try {
      await listingApi.patch(`/listings/${listingId}`, buildPayload(form));
      return true;
    } catch (e) {
      Alert.alert("Save Failed", apiErrorMessage(e));
      return false;
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    const ok = await saveAll();
    setSavingDraft(false);
    if (ok) {
      qc.invalidateQueries({ queryKey: ["myListings"] });
      Alert.alert("Draft Saved", "Your listing progress has been saved.");
    }
  }

  async function handleNext() {
    if (!validateStep(step)) return;
    setSaving(true);
    const ok = await saveAll();
    setSaving(false);
    if (ok) setStep((s) => s + 1);
  }

  async function handleFinish() {
    if (!validateStep(step)) return;
    setSaving(true);
    const ok = await saveAll();
    if (!ok) {
      setSaving(false);
      return;
    }

    if (["draft", "deactivated"].includes(status)) {
      try {
        const res = await listingApi.post(`/listings/${listingId}/activate`);
        setSaving(false);
        qc.invalidateQueries({ queryKey: ["myListings"] });
        Alert.alert(
          "Listing Live!",
          res.data?.data?.message ?? "Your car rental listing is now live and visible to travellers.",
          [{ text: "OK", onPress: () => router.replace("/(provider)/listings" as any) }]
        );
      } catch (e) {
        setSaving(false);
        Alert.alert("Activation Failed", apiErrorMessage(e));
      }
    } else {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["myListings"] });
      Alert.alert(
        "Car Listing Saved",
        "Your listing changes have been saved.",
        [{ text: "OK", onPress: () => router.replace("/(provider)/listings" as any) }]
      );
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
    else handleExit();
  }

  function handleExit() {
    Alert.alert("Leave listing setup?", "Your saved steps are kept. You can continue anytime from My Listings.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => router.replace("/(provider)/listings" as any) },
    ]);
  }

  const hasMinPhotos = media.photos.length >= 3;
  const isLastStep = step === STEPS.length - 1;

  const lastLabel = ["draft", "deactivated"].includes(status)
    ? (status === "deactivated" ? "Reactivate Live" : "Activate Live")
    : "Save & Finish";

  const lastStepDisabled = isLastStep && !hasMinPhotos;
  const lastStepDisabledHint = isLastStep && !hasMinPhotos
    ? "Upload at least 3 photos before activating."
    : undefined;

  if (!listingId) {
    return (
      <View style={[s.center, { padding: 24 }]}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: K.colors.textDark, marginBottom: 8, textAlign: "center" }}>
          Listing Not Found
        </Text>
        <Text style={{ fontSize: 14, color: K.colors.textMuted, marginBottom: 20, textAlign: "center" }}>
          No listing ID was provided to this setup wizard.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: K.colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => router.replace("/(provider)/listings" as any)}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Back to My Listings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={K.colors.accent} />
        <Text style={s.loadingText}>Loading your listing…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.center, { padding: 24 }]}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: K.colors.error, marginBottom: 8, textAlign: "center" }}>
          Failed to Load Listing
        </Text>
        <Text style={{ fontSize: 14, color: K.colors.textMuted, marginBottom: 20, textAlign: "center" }}>
          Could not fetch listing details from the server. Please verify your internet connection.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: K.colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => router.replace("/(provider)/listings" as any)}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Back to My Listings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <WizardHeader title="Car Listing" step={step} steps={STEPS} onBack={handleBack} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : isKeyboardOpen ? "height" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          <Text style={s.stepHint}>{STEP_HINTS[step]}</Text>

          {/* ── Step 0: Identity & classification ─────────────────────────── */}
          {step === 0 && (
            <View>
              <InfoBanner
                message="Vehicle listings go live as soon as the requirements are met — no admin review needed."
                variant="info"
              />
              <View style={s.gap} />

              <FormField
                label="Listing Title"
                required
                value={form.name}
                onChangeText={(t) => set("name", t)}
                placeholder="e.g. 2022 Toyota Land Cruiser Prado TX"
                maxLength={200}
                error={errors.name}
              />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Make"
                    required
                    value={form.carMake}
                    onChangeText={(t) => set("carMake", t)}
                    placeholder="e.g. Toyota"
                    error={errors.carMake}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Model"
                    required
                    value={form.carModel}
                    onChangeText={(t) => set("carModel", t)}
                    placeholder="e.g. Prado"
                    error={errors.carModel}
                  />
                </View>
              </View>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Year"
                    required
                    value={form.carYear}
                    onChangeText={(t) => set("carYear", t.replace(/\D/g, ""))}
                    placeholder={String(currentYear)}
                    keyboardType="number-pad"
                    maxLength={4}
                    error={errors.carYear}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectField
                    label="Category"
                    required
                    options={CAR_CATEGORIES}
                    selected={form.carCategory}
                    onSelect={(v) => set("carCategory", v)}
                    error={errors.carCategory}
                  />
                </View>
              </View>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Licence Plate"
                    required
                    value={form.licencePlate}
                    onChangeText={(t) => set("licencePlate", t)}
                    placeholder="KDA 123X"
                    autoCapitalize="characters"
                    error={errors.licencePlate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Odometer (km)"
                    required
                    value={form.odometerReading}
                    onChangeText={(t) => set("odometerReading", t.replace(/\D/g, ""))}
                    placeholder="45000"
                    keyboardType="number-pad"
                    error={errors.odometerReading}
                  />
                </View>
              </View>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Fleet Count"
                    value={form.unitCount}
                    onChangeText={(t) => set("unitCount", t.replace(/\D/g, ""))}
                    placeholder="1"
                    keyboardType="number-pad"
                    error={errors.unitCount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Colour"
                    value={form.colour}
                    onChangeText={(t) => set("colour", t)}
                    placeholder="e.g. Pearl White"
                    error={errors.colour}
                  />
                </View>
              </View>

              <FormField
                label="Engine Size"
                value={form.engineSize}
                onChangeText={(t) => set("engineSize", t)}
                placeholder="e.g. 2.8L Turbo Diesel"
                error={errors.engineSize}
              />

              <FormField
                label="Description"
                hint={`${form.description.length}/1000 characters`}
                value={form.description}
                onChangeText={(t) => set("description", t.slice(0, 1000))}
                placeholder="Describe features, condition, luggage capacity…"
                multiline
                numberOfLines={4}
                error={errors.description}
              />

              <SectionHeader
                title="Pickup Location"
                subtitle="Search for your depot/office or drag the pin to where renters collect the car."
                icon="map-pin"
              />

              <LocationPicker
                label="Find pickup address"
                value={{ lat: form.lat, lng: form.lng, address: form.address }}
                onChange={(place) => {
                  setForm((f) => {
                    const nextCountry = place.country || f.country;
                    const detectedCurrency = place.country ? getCurrencyForCountry(place.country) : null;
                    return {
                      ...f,
                      address: place.address || f.address,
                      town: place.town || f.town,
                      neighborhood: place.neighborhood || f.neighborhood,
                      country: nextCountry,
                      currency: detectedCurrency || f.currency,
                      lat: place.lat,
                      lng: place.lng,
                    };
                  });
                  if (place.country) {
                    setSelectedCountry(ALL_COUNTRIES.find((c) => c.code === place.country) ?? null);
                  }
                  setErrors((e) => ({ ...e, address: undefined }));
                }}
                onCoordinatesChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
                countryHint={form.country || undefined}
                error={errors.address}
              />

              <FormField
                label="Full pickup address"
                required
                value={form.address}
                onChangeText={(t) => set("address", t)}
                placeholder="Filled in from the search — edit if needed"
                error={errors.address}
              />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Town / City"
                    value={form.town}
                    onChangeText={(t) => set("town", t)}
                    placeholder="Filled in from the map"
                    error={errors.town}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Neighborhood"
                    value={form.neighborhood}
                    onChangeText={(t) => set("neighborhood", t)}
                    placeholder="Neighborhood"
                    error={errors.neighborhood}
                  />
                </View>
              </View>

              <CountryPickerButton
                label="Country"
                required
                selectedCountry={selectedCountry}
                onPress={() => setCountryModalOpen(true)}
                error={errors.country}
              />
            </View>
          )}

          {/* ── Step 1: Technical specs ───────────────────────────────────── */}
          {step === 1 && (
            <View>
              <SectionHeader title="Drivetrain & Fuel" icon="settings" />

              <SelectField
                label="Transmission"
                required
                options={TRANSMISSION_OPTIONS}
                selected={form.transmission}
                onSelect={(v) => set("transmission", v)}
                error={errors.transmission}
              />

              <SelectField
                label="Fuel Type"
                required
                options={FUEL_TYPE_OPTIONS}
                selected={form.fuelType}
                onSelect={(v) => set("fuelType", v)}
                error={errors.fuelType}
              />

              <SelectField
                label="Drive Type"
                required
                options={DRIVE_TYPE_OPTIONS}
                selected={form.driveType}
                onSelect={(v) => set("driveType", v)}
                error={errors.driveType}
              />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Seats"
                    required
                    value={form.seats}
                    onChangeText={(t) => set("seats", t.replace(/\D/g, ""))}
                    placeholder="5"
                    keyboardType="number-pad"
                    error={errors.seats}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Doors"
                    required
                    value={form.doors}
                    onChangeText={(t) => set("doors", t.replace(/\D/g, ""))}
                    placeholder="4"
                    keyboardType="number-pad"
                    error={errors.doors}
                  />
                </View>
              </View>

              <SectionHeader title="Features" icon="star" />

              <SwitchRow
                label="Air Conditioning"
                value={form.airConditioning}
                onValueChange={(v) => set("airConditioning", v)}
              />
              <SwitchRow
                label="Roadside Assistance"
                value={form.roadsideAssistance}
                onValueChange={(v) => set("roadsideAssistance", v)}
              />
              <SwitchRow
                label="Cross-Border Allowed"
                value={form.crossBorderAllowed}
                onValueChange={(v) => set("crossBorderAllowed", v)}
              />
              <SwitchRow
                label="Airport Pickup"
                value={form.airportPickup}
                onValueChange={(v) => set("airportPickup", v)}
              />
              <SwitchRow
                label="Return to Same Location"
                value={form.returnSameLocation}
                onValueChange={(v) => set("returnSameLocation", v)}
              />
              <SwitchRow
                label="Driver Provided"
                value={form.driverProvided}
                onValueChange={(v) => set("driverProvided", v)}
              />
              <SwitchRow
                label="Allow pre-booking messages"
                hint="Let renters message you before they book"
                value={form.allowPreBooking}
                onValueChange={(v) => set("allowPreBooking", v)}
              />
            </View>
          )}

          {/* ── Step 2: Rental terms & insurance ──────────────────────────── */}
          {step === 2 && (
            <View>
              <SectionHeader title="Pricing" icon="tag" />

              <FormField
                label="Daily Rate"
                required
                value={form.pricePerDay}
                onChangeText={(t) => set("pricePerDay", t)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                error={errors.pricePerDay}
              />

              <SelectField
                label="Currency"
                required
                options={ALL_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.symbol}` }))}
                selected={form.currency}
                onSelect={(v) => set("currency", v)}
                error={errors.currency}
              />

              <PayoutCurrencyWarning
                providerCountry={providerCountry}
                listingCountry={form.country}
                currency={form.currency}
              />

              <SelectField
                label="Cancellation Policy"
                required
                options={CANCELLATION_POLICIES}
                selected={form.cancellationPolicy}
                onSelect={(v) => set("cancellationPolicy", v)}
                error={errors.cancellationPolicy}
              />

              <FormField
                label="Minimum Rental Days"
                value={form.minimumRentalDays}
                onChangeText={(t) => set("minimumRentalDays", t.replace(/\D/g, ""))}
                placeholder="1"
                keyboardType="number-pad"
                error={errors.minimumRentalDays}
              />

              <SelectField
                label="Mileage Policy"
                required
                options={MILEAGE_POLICY_OPTIONS}
                selected={form.mileagePolicy}
                onSelect={(v) => set("mileagePolicy", v)}
                error={errors.mileagePolicy}
              />

              {form.mileagePolicy === "limited" && (
                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Daily Limit (km)"
                      required
                      value={form.mileageLimitKm}
                      onChangeText={(t) => set("mileageLimitKm", t.replace(/\D/g, ""))}
                      placeholder="e.g. 200"
                      keyboardType="number-pad"
                      error={errors.mileageLimitKm}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Extra km Rate"
                      value={form.extraKmRate}
                      onChangeText={(t) => set("extraKmRate", t)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      error={errors.extraKmRate}
                    />
                  </View>
                </View>
              )}

              <SelectField
                label="Fuel Policy"
                required
                options={FUEL_POLICY_OPTIONS}
                selected={form.fuelPolicy}
                onSelect={(v) => set("fuelPolicy", v)}
                error={errors.fuelPolicy}
              />

              <SelectField
                label="Insurance Type"
                required
                options={INSURANCE_TYPE_OPTIONS}
                selected={form.insuranceType}
                onSelect={(v) => set("insuranceType", v)}
                error={errors.insuranceType}
              />

              <SectionHeader title="Pickup Hours & Requirements" icon="clock" />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Pickup Hours From"
                    value={form.pickupHoursFrom}
                    onChangeText={(t) => set("pickupHoursFrom", t)}
                    placeholder="08:00"
                    error={errors.pickupHoursFrom}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Pickup Hours To"
                    value={form.pickupHoursTo}
                    onChangeText={(t) => set("pickupHoursTo", t)}
                    placeholder="18:00"
                    error={errors.pickupHoursTo}
                  />
                </View>
              </View>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Min Driver Age"
                    value={form.minimumDriverAge}
                    onChangeText={(t) => set("minimumDriverAge", t.replace(/\D/g, ""))}
                    placeholder="21"
                    keyboardType="number-pad"
                    error={errors.minimumDriverAge}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Security Deposit"
                    value={form.securityDeposit}
                    onChangeText={(t) => set("securityDeposit", t)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    error={errors.securityDeposit}
                  />
                </View>
              </View>

              <SectionHeader title="Delivery" icon="truck" />

              <SwitchRow
                label="Delivery Available"
                hint="Deliver the vehicle to the renter"
                value={form.deliveryEnabled}
                onValueChange={(v) => set("deliveryEnabled", v)}
              />

              {form.deliveryEnabled && (
                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Delivery Radius (km)"
                      required
                      value={form.deliveryRadiusKm}
                      onChangeText={(t) => set("deliveryRadiusKm", t.replace(/\D/g, ""))}
                      placeholder="e.g. 25"
                      keyboardType="number-pad"
                      error={errors.deliveryRadiusKm}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Delivery Fee"
                      value={form.deliveryFee}
                      onChangeText={(t) => set("deliveryFee", t)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      error={errors.deliveryFee}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Step 3: Media & Documents ──────────────────────────────────── */}
          {step === 3 && (
            <View>
              <PhotosSection
                photos={media.photos}
                uploading={media.uploadingPhoto}
                uploadProgress={media.uploadProgress ?? undefined}
                onAdd={() => media.pickAndUploadPhoto("library")}
                onCapture={() => media.pickAndUploadPhoto("camera")}
                onDelete={media.deletePhoto}
                onReorder={media.reorderPhoto}
                minPhotos={3}
                maxPhotos={30}
                error={errors.photos}
              />

              <View style={s.gap} />

              <DocumentsSection
                docTypes={CAR_DOCS}
                documents={media.documents}
                uploadingDoc={media.uploadingDoc}
                onUpload={media.pickAndUploadDocument}
                onDelete={media.deleteDocument}
                note="Vehicle documents are required before this listing can go live."
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <WizardFooter
          onNext={isLastStep ? handleFinish : handleNext}
          onBack={handleBack}
          onSaveDraft={handleSaveDraft}
          saveDraftLoading={savingDraft}
          isFirst={step === 0}
          isLast={isLastStep}
          lastLabel={lastLabel}
          loading={saving}
          disabled={lastStepDisabled}
          disabledHint={lastStepDisabledHint}
        />
      </KeyboardAvoidingView>

      <CountryPickerModal
        visible={countryModalOpen}
        selectedCode={form.country}
        onSelect={selectCountry}
        onClose={() => setCountryModalOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: K.colors.bgApp },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: K.colors.bgApp },
  loadingText: { fontSize: 14, color: K.colors.textMuted },
  scroll: { paddingHorizontal: 18, paddingTop: 14 },
  stepHint: { fontSize: 12, color: K.colors.textMuted, marginBottom: 12 },
  row2: { flexDirection: "row", gap: 12 },
  gap: { height: 18 },
});
