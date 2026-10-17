export const employmentTypes = [
  "internship",
  "full_time",
  "part_time",
  "contract",
] as const;

export const workModes = ["onsite", "hybrid", "remote"] as const;

export const jobFields = [
  "software",
  "ai_ml",
  "finance",
  "marketing",
  "design",
  "operations",
  "sales",
  "product",
  "other",
] as const;

export const verificationStatuses = [
  "VERIFIED",
  "RECENTLY_VERIFIED",
  "UNVERIFIED",
  "EXPIRED",
] as const;

export const startupRoleTypes = [
  "engineering",
  "product",
  "founder_office",
  "growth",
  "sales",
  "marketing",
  "operations",
  "design",
  "finance",
  "research",
  "other",
] as const;

export const mapEntityTypes = ["company", "startup", "investor", "event", "radar"] as const;

export type EmploymentType = (typeof employmentTypes)[number];
export type WorkMode = (typeof workModes)[number];
export type JobField = (typeof jobFields)[number];
export type VerificationStatus = (typeof verificationStatuses)[number];
export type MapEntityType = (typeof mapEntityTypes)[number];
export type SourceProvider =
  | "yc"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "workable"
  | "recruitee"
  | "personio"
  | "bamboohr"
  | "breezy"
  | "workday";
export type SourceCategory =
  | "ats"
  | "job_board"
  | "startup_board"
  | "startup_directory"
  | "career_page"
  | "aggregator"
  | "discovery_source";
export type SourceKind =
  | "official_careers_page"
  | "official_ats"
  | "trusted_job_board"
  | "other";
export type StartupStage =
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b"
  | "series_c_plus"
  | "growth";
export type StartupRoleType = (typeof startupRoleTypes)[number];
export type CompanyType =
  | "startup"
  | "mnc"
  | "large_enterprise"
  | "sme"
  | "government"
  | "university"
  | "research"
  | "ngo"
  | "consulting"
  | "financial_services"
  | "healthcare"
  | "manufacturing"
  | "retail"
  | "technology"
  | "media"
  | "logistics"
  | "automotive"
  | "aerospace"
  | "biotech"
  | "energy"
  | "telecommunications"
  | "other";
export type LocationType = "physical" | "hybrid" | "remote" | "unknown";
export type LocationConfidence =
  | "exact_office"
  | "city_level"
  | "region_level"
  | "country_level"
  | "remote"
  | "unknown";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type SalaryRange = {
  min: number | null;
  max: number | null;
  currency: string | null;
};

export type CompanySummary = {
  id: string;
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus: VerificationStatus;
  openRoles?: number;
  internships?: number;
};

export type StartupMetadata = {
  isStartup: boolean;
  source?: string;
  stage?: StartupStage;
  ycFunded?: boolean;
  accelerator?: string;
  batch?: string;
  employeeCount?: number;
  foundedYear?: number;
  activelyHiring?: boolean;
};

export type DiscoveredCompany = {
  id: string;
  name: string;
  source: string;
  sourceType: SourceCategory;
  sourceUrl?: string | null;
  website?: string | null;
  careersUrl?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  locations: string[];
  city?: string | null;
  country?: string | null;
  industries?: string[];
  tags?: string[];
  startup: StartupMetadata;
  detectedSource?: {
    provider: SourceProvider;
    key?: string;
    careersUrl: string;
  } | null;
};

export type CompanySourceReference = {
  source: string;
  sourceType: SourceCategory;
  sourceUrl?: string | null;
};

export type JobSourceProvenance = {
  source: SourceProvider;
  sourceKey: string;
  sourceType?: SourceCategory;
  sourceKind: SourceKind;
  sourceUrl: string;
  applyUrl: string;
  sourceRank: number;
};

export type UnsupportedCareerSource = {
  companyId: string;
  companyName: string;
  website?: string | null;
  careersUrl?: string | null;
  detectedPlatform: string | null;
  evidence?: string | null;
  status: "unsupported" | "unknown" | "failed";
  estimatedJobs?: number | null;
};

export type CanonicalCompany = {
  id: string;
  name: string;
  normalizedName: string;
  website?: string | null;
  careersUrl?: string | null;
  logoUrl?: string | null;
  industries: string[];
  companyType?: CompanyType;
  headquarters?: string | null;
  offices: Array<{
    raw: string;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  country?: string | null;
  cities: string[];
  employeeCount?: number | null;
  foundedYear?: number | null;
  startup?: StartupMetadata;
  isHiring?: boolean;
  sources: CompanySourceReference[];
  atsSources: SourceConfig[];
  unsupportedSources: UnsupportedCareerSource[];
  discoveredAt: string;
  updatedAt: string;
};

export type NormalizedJob = {
  id: string;
  externalId: string;
  source: SourceProvider;
  sourceKey: string;
  sourceKind: SourceKind;
  sourceType?: SourceCategory;
  sourceUrl: string;
  applyUrl: string;
  sourceRank: number;
  title: string;
  normalizedTitle: string;
  companyName: string;
  companyId?: string | null;
  company?: CompanySummary | null;
  description?: string | null;
  employmentType: EmploymentType;
  workMode: WorkMode;
  field: JobField;
  skills: string[];
  salary: SalaryRange;
  locationText: string;
  locationCandidates: string[];
  locationType?: LocationType;
  locationConfidence?: LocationConfidence;
  remoteEligible?: boolean;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  postedAt?: string | null;
  expiresAt?: string | null;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationNote: string;
  lastCheckedAt?: string | null;
  startup?: StartupMetadata;
  studentRelevant?: boolean;
  startupRoleType?: StartupRoleType;
  sourceProvenance?: JobSourceProvenance[];
  score?: number;
};

export type NearbyJobsQuery = {
  lat: number;
  lng: number;
  radius: number;
  sourceDiscovery?: "off" | "validated";
  sourceProvider?: SourceProvider | "all";
  employmentType?: EmploymentType | "all";
  field?: JobField | "all";
  workMode?: WorkMode | "any";
  salaryMin?: number | null;
  freshness?: "any" | "24h" | "3d" | "7d" | "30d";
  query?: string;
  startupOnly?: boolean;
  studentRelevantOnly?: boolean;
  startupRoleType?: StartupRoleType | "all";
  showRemoteOnMap?: boolean;
  page: number;
  limit: number;
};

export type NearbyJobsResponse = {
  jobs: NormalizedJob[];
  mapJobs: NormalizedJob[];
  total: number;
  page: number;
  limit: number;
  radiusKm: number;
  center: Coordinates;
  warnings: string[];
  sources: SourceHealthSummary;
  coverage: CoverageSummary;
  debug?: SearchDebugSummary;
};

export type MapEntity = {
  id: string;
  type: MapEntityType;
  name: string;
  description?: string | null;
  url?: string | null;
  logoUrl?: string | null;
  source: string;
  sourceUrl?: string | null;
  locationText: string;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
  locationConfidence: LocationConfidence;
  metadata?: Record<string, string | number | boolean | null>;
};

export type MapEntitiesQuery = {
  lat: number;
  lng: number;
  radius: number;
  layers?: MapEntityType[];
  limit?: number;
};

export type MapEntitySourceHealth = {
  source: string;
  type: MapEntityType;
  status: "success" | "failed";
  entitiesFound: number;
  durationMs: number;
  error?: string;
};

export type MapEntitiesResponse = {
  entities: MapEntity[];
  total: number;
  center: Coordinates;
  radiusKm: number;
  warnings: string[];
  sources: MapEntitySourceHealth[];
};

export type CoverageSummary = {
  startupSources: number;
  atsSources: number;
  jobBoardSources: number;
  companiesScanned: number;
  jobsBeforeDedup: number;
  jobsAfterDedup: number;
  resultsAfterFilters: number;
  bengaluruJobs: number;
  remoteJobs: number;
  startupJobs: number;
  startupInternships: number;
  studentRelevantJobs: number;
  mappableJobs: number;
};

export type SearchDebugSummary = {
  pipeline: {
    sourcesRequested: number;
    sourcesSucceeded: number;
    sourcesFailed: number;
    rawJobsFetched: number;
    normalizedJobs: number;
    locationMatchedJobs: number;
    uniqueJobs: number;
    sortedResults: number;
    pageJobs: number;
    possibleMapJobsBeforeSorting: number;
    possibleMapDotsBeforeSorting: number;
    mapRowsAfterFiltersBeforeLimit: number;
    mapDotsAfterFiltersBeforeLimit: number;
    mapDotsRemovedByFilters: number;
    mapDotsRemovedByLimit: number;
    mapJobs: number;
    mapMarkers: number;
    mapJobsAfterSorting: number;
    mapDotsAfterSorting: number;
    internshipsFound: number;
    internshipsSorted: number;
    remoteJobsSorted: number;
    physicalJobsSorted: number;
  };
  mapExclusions: {
    totalNotOnMap: number;
    byReason: Array<{
      reason: string;
      count: number;
    }>;
    examples: Array<{
      id: string;
      title: string;
      companyName: string;
      source: SourceProvider;
      sourceKey: string;
      workMode: WorkMode;
      employmentType: EmploymentType;
      locationText: string;
      locationConfidence?: LocationConfidence;
      reason: string;
    }>;
  };
  mapDotBreakdown: {
    shownGroups: Array<{
      companyName: string;
      locationText: string;
      jobs: number;
      latitude: number;
      longitude: number;
    }>;
    filteredOutGroups: Array<{
      companyName: string;
      locationText: string;
      jobs: number;
      latitude: number;
      longitude: number;
      reason: string;
    }>;
  };
};

export type SourceHealth = {
  source: string;
  provider: SourceProvider | "unknown";
  sourceType?: SourceCategory;
  status: "success" | "failed";
  jobsFetched: number;
  jobsAccepted: number;
  durationMs: number;
  cached?: boolean;
  error?: string;
};

export type SourceHealthSummary = {
  total: number;
  successful: number;
  failed: number;
  rawAccepted: number;
  locationFiltered: number;
  deduped: number;
  details: Array<Omit<SourceHealth, "error">>;
};

export type LocationSearchResult = Coordinates & {
  label: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export type SourceConfig = {
  provider: SourceProvider;
  key: string;
  id?: string;
  displayName?: string;
  website?: string;
  careersUrl?: string;
  type?: SourceCategory;
  startup?: StartupMetadata;
  enabled: boolean;
  priority?: number;
  cities?: string[];
  countries?: string[];
  endpoint?: string;
  tenant?: string;
  site?: string;
  searchText?: string;
};

export type RawFetchResult<T> = {
  source: SourceConfig;
  jobs: T[];
  warning?: string;
};

export type SourceFetchContext = {
  includeContent?: boolean;
  location?: {
    city?: string;
    latitude: number;
    longitude: number;
  };
  searchRadiusKm?: number;
  includeRemote?: boolean;
  jobTypes?: string[];
  query?: string;
  maxResults?: number;
};

export type CompanyDiscoveryContext = {
  city?: string;
  country?: string;
  includeRemote?: boolean;
  query?: string;
  maxResults?: number;
};

export type CompanyDiscoveryHealth = {
  source: string;
  sourceType: SourceCategory;
  status: "success" | "failed";
  companiesFound: number;
  durationMs: number;
  error?: string;
};

export type CompanyDiscoveryResponse = {
  companies: DiscoveredCompany[];
  sources: CompanyDiscoveryHealth[];
};

export type CareersDiscoveryResult = {
  companyId: string;
  companyName: string;
  website?: string | null;
  careersUrl?: string | null;
  status: "found" | "not_found" | "failed";
  evidence?: string | null;
  error?: string;
};

export interface CompanyDiscoverySource {
  id: string;
  name: string;
  type: SourceCategory;
  discoverCompanies(context?: CompanyDiscoveryContext): Promise<DiscoveredCompany[]>;
}

export interface JobSource<RawJob = unknown> {
  provider: SourceProvider;
  source: SourceConfig;
  fetchJobs(options?: SourceFetchContext): Promise<RawJob[]>;
  normalize(job: RawJob): NormalizedJob | null;
}
