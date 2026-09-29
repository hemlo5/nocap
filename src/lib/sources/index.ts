import { AshbySource } from "@/lib/sources/ashby";
import { BambooHrSource } from "@/lib/sources/bamboohr";
import { BreezySource } from "@/lib/sources/breezy";
import {
  findSourceConfig,
  getSourceConfigsForSearch,
} from "@/lib/sources/default-sources";
import { GreenhouseSource } from "@/lib/sources/greenhouse";
import { LeverSource } from "@/lib/sources/lever";
import { PersonioSource } from "@/lib/sources/personio";
import { RecruiteeSource } from "@/lib/sources/recruitee";
import { SmartRecruitersSource } from "@/lib/sources/smartrecruiters";
import { WorkableSource } from "@/lib/sources/workable";
import { WorkdaySource } from "@/lib/sources/workday";
import { YcJobsSource } from "@/lib/sources/yc-jobs";
import type { JobSource, NearbyJobsQuery, SourceConfig } from "@/lib/types";

export function createSource(config: SourceConfig): JobSource {
  if (config.provider === "yc") {
    return new YcJobsSource(config);
  }
  if (config.provider === "greenhouse") {
    return new GreenhouseSource(config);
  }
  if (config.provider === "lever") {
    return new LeverSource(config);
  }
  if (config.provider === "ashby") {
    return new AshbySource(config);
  }
  if (config.provider === "smartrecruiters") {
    return new SmartRecruitersSource(config);
  }
  if (config.provider === "workable") {
    return new WorkableSource(config);
  }
  if (config.provider === "recruitee") {
    return new RecruiteeSource(config);
  }
  if (config.provider === "personio") {
    return new PersonioSource(config);
  }
  if (config.provider === "bamboohr") {
    return new BambooHrSource(config);
  }
  if (config.provider === "breezy") {
    return new BreezySource(config);
  }
  return new WorkdaySource(config);
}

export function getEnabledSources(query?: NearbyJobsQuery): JobSource[] {
  return getSourceConfigsForSearch(query).map(createSource);
}

export function getSourceById(provider: string, key: string): JobSource | null {
  const config = findSourceConfig(provider, key);
  return config ? createSource(config) : null;
}
