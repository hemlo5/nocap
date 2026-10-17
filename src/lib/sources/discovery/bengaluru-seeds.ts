import type {
  CompanyDiscoveryContext,
  CompanyDiscoverySource,
  DiscoveredCompany,
  SourceProvider,
} from "@/lib/types";
import { normalizeKey } from "@/lib/utils/strings";

type BengaluruSeed = {
  name: string;
  website: string;
  careersUrl?: string;
  sourceUrl?: string;
  industries?: string[];
  startup?: boolean;
  detectedSource?: {
    provider: SourceProvider;
    key?: string;
    careersUrl: string;
  };
};

const BENGALURU_SEEDS: BengaluruSeed[] = [
  seed("Zerodha", "https://zerodha.com", "https://zerodha.com/careers/"),
  seed("Kite", "https://kite.trade", "https://zerodha.com/careers/"),
  seed("Razorpay", "https://razorpay.com", "https://razorpay.com/jobs/"),
  seed("PhonePe", "https://www.phonepe.com", "https://www.phonepe.com/careers/"),
  seed("Groww", "https://groww.in", "https://groww.in/careers"),
  seed("CRED", "https://cred.club", "https://cred.club/careers"),
  seed("Jupiter", "https://jupiter.money", "https://jupiter.money/careers"),
  seed("Fi Money", "https://fi.money", "https://fi.money/careers"),
  seed("Smallcase", "https://www.smallcase.com", "https://www.smallcase.com/careers"),
  seed("Navi", "https://navi.com", "https://navi.com/careers"),
  seed("Acko", "https://acko.com", "https://acko.com/careers"),
  seed("Cashfree Payments", "https://www.cashfree.com", "https://www.cashfree.com/careers"),
  seed("Juspay", "https://juspay.in", "https://juspay.in/careers"),
  seed("Open Financial", "https://open.money", "https://open.money/careers"),
  seed("Setu", "https://setu.co", "https://setu.co/careers"),
  seed("Rupeek", "https://rupeek.com", "https://rupeek.com/careers"),
  seed("Moneyview", "https://moneyview.in", "https://moneyview.in/careers"),
  seed("KreditBee", "https://www.kreditbee.in", "https://www.kreditbee.in/careers"),
  seed("Slice", "https://www.sliceit.com", "https://www.sliceit.com/careers"),
  seed("Simpl", "https://getsimpl.com", "https://getsimpl.com/careers"),
  seed("M2P Fintech", "https://m2pfintech.com", "https://m2pfintech.com/careers"),

  seed("Meesho", "https://www.meesho.io", "https://www.meesho.io/careers"),
  seed("Myntra", "https://www.myntra.com", "https://careers.myntra.com"),
  seed("Flipkart", "https://www.flipkart.com", "https://www.flipkartcareers.com"),
  seed("Swiggy", "https://www.swiggy.com", "https://careers.swiggy.com/"),
  seed("Zepto", "https://www.zeptonow.com", "https://www.zeptonow.com/careers"),
  seed("Dunzo", "https://www.dunzo.com", "https://www.dunzo.com/careers"),
  seed("Licious", "https://www.licious.in", "https://www.licious.in/careers"),
  seed("Wakefit", "https://www.wakefit.co", "https://www.wakefit.co/careers"),
  seed("Moglix", "https://www.moglix.com", "https://www.moglix.com/careers"),
  seed("Udaan", "https://udaan.com", "https://careers.udaan.com"),
  seed("BigBasket", "https://www.bigbasket.com", "https://www.bigbasket.com/careers/"),
  seed("Urban Company", "https://www.urbancompany.com", "https://www.urbancompany.com/careers"),
  seed("Shadowfax", "https://www.shadowfax.in", "https://www.shadowfax.in/careers"),
  seed("Porter", "https://porter.in", "https://porter.in/careers"),
  seed("Rapido", "https://www.rapido.bike", "https://www.rapido.bike/careers"),
  seed("BlackBuck", "https://www.blackbuck.com", "https://www.blackbuck.com/careers"),
  seed("Bounce", "https://bounceshare.com", "https://bounceshare.com/careers"),

  seed("Postman", "https://www.postman.com", "https://www.postman.com/company/careers/"),
  seed("HackerRank", "https://www.hackerrank.com", "https://www.hackerrank.com/careers"),
  seed("BrowserStack", "https://www.browserstack.com", "https://www.browserstack.com/careers"),
  seed("InMobi", "https://www.inmobi.com", "https://www.inmobi.com/company/careers/"),
  seed("Glance", "https://glance.com", "https://glance.com/careers"),
  seed("Dailyhunt", "https://m.dailyhunt.in", "https://verse.in/careers/"),
  seed("VerSe Innovation", "https://verse.in", "https://verse.in/careers/"),
  seed("ShareChat", "https://sharechat.com", "https://sharechat.com/careers"),
  seed("Moj", "https://mojapp.in", "https://sharechat.com/careers"),
  seed("Whatfix", "https://whatfix.com", "https://whatfix.com/careers/"),
  seed("Chargebee", "https://www.chargebee.com", "https://www.chargebee.com/careers/"),
  seed("Druva", "https://www.druva.com", "https://www.druva.com/about/careers/"),
  seed("Yellow.ai", "https://yellow.ai", "https://yellow.ai/careers/"),
  seed("Darwinbox", "https://darwinbox.com", "https://darwinbox.com/careers/"),
  seed("Keka", "https://www.keka.com", "https://www.keka.com/careers/"),
  seed("LeadSquared", "https://www.leadsquared.com", "https://www.leadsquared.com/careers/"),
  seed("Capillary Technologies", "https://www.capillarytech.com", "https://capillarytech.com/careers/"),
  seed("Observe.AI", "https://www.observe.ai", "https://www.observe.ai/careers"),
  seed("DevRev", "https://devrev.ai", "https://devrev.ai/careers"),
  seed("Hasura", "https://hasura.io", "https://hasura.io/careers/"),
  seed("SigNoz", "https://signoz.io", "https://signoz.io/careers/"),
  seed("Exotel", "https://exotel.com", "https://exotel.com/careers/"),
  seed("MoEngage", "https://www.moengage.com", "https://www.moengage.com/careers/"),
  seed("Plivo", "https://www.plivo.com", "https://www.plivo.com/careers/"),
  seed("Airmeet", "https://www.airmeet.com", "https://www.airmeet.com/careers/"),
  seed("Zuddl", "https://www.zuddl.com", "https://www.zuddl.com/careers/"),
  seed("Sprinto", "https://sprinto.com", "https://sprinto.com/careers/"),
  seed("Zluri", "https://www.zluri.com", "https://www.zluri.com/careers"),
  seed("Rocketlane", "https://www.rocketlane.com", "https://www.rocketlane.com/careers"),
  seed("Toplyne", "https://www.toplyne.io", "https://toplyne.io/careers"),
  seed("Spendflo", "https://www.spendflo.com", "https://www.spendflo.com/careers"),
  seed("Clarisights", "https://www.clarisights.com", "https://www.clarisights.com/careers"),
  seed("Factors.ai", "https://www.factors.ai", "https://www.factors.ai/careers"),
  seed("Fyle", "https://www.fylehq.com", "https://www.fylehq.com/careers"),
  seed("Nanonets", "https://nanonets.com", "https://nanonets.com/careers"),
  seed("Qure.ai", "https://www.qure.ai", "https://www.qure.ai/careers"),
  seed("Skit.ai", "https://skit.ai", "https://skit.ai/careers"),
  seed("Sarvam AI", "https://www.sarvam.ai", "https://www.sarvam.ai/careers"),
  seed("Krutrim", "https://olakrutrim.com", "https://olakrutrim.com/careers"),
  seed("Minus Zero", "https://minuszero.in", "https://minuszero.in/careers"),
  seed("Ema", "https://www.ema.co", "https://www.ema.co/careers"),
  seed("Saral", "https://saral.club", "https://saral.club/careers"),
  seed("Turbostart", "https://www.turbostart.co", "https://www.turbostart.co/careers"),

  seed("Ather Energy", "https://www.atherenergy.com", "https://www.atherenergy.com/careers"),
  seed("Ola Electric", "https://www.olaelectric.com", "https://www.olaelectric.com/careers"),
  seed("Simple Energy", "https://www.simpleenergy.in", "https://www.simpleenergy.in/careers"),
  seed("Ultraviolette", "https://www.ultraviolette.com", "https://www.ultraviolette.com/careers"),
  seed("Log9 Materials", "https://www.log9materials.com", "https://www.log9materials.com/careers"),
  seed("Pixxel", "https://www.pixxel.space", "https://www.pixxel.space/careers"),
  seed("Bellatrix Aerospace", "https://www.bellatrix.aero", "https://www.bellatrix.aero/careers"),
  seed("Agnikul", "https://agnikul.in", "https://agnikul.in/careers"),
  seed("Astrome", "https://astrome.co", "https://astrome.co/careers"),
  seed("ideaForge", "https://www.ideaforgetech.com", "https://www.ideaforgetech.com/careers"),

  seed("Vedantu", "https://www.vedantu.com", "https://www.vedantu.com/careers"),
  seed("Unacademy", "https://unacademy.com", "https://unacademy.com/careers"),
  seed("Scaler", "https://www.scaler.com", "https://www.scaler.com/careers"),
  seed("InterviewBit", "https://www.interviewbit.com", "https://www.scaler.com/careers"),
  seed("Masai School", "https://www.masaischool.com", "https://www.masaischool.com/careers"),
  seed("Newton School", "https://www.newtonschool.co", "https://www.newtonschool.co/careers"),
  seed("Cuemath", "https://www.cuemath.com", "https://www.cuemath.com/careers/"),
  seed("Simplilearn", "https://www.simplilearn.com", "https://www.simplilearn.com/careers"),
  seed("upGrad", "https://www.upgrad.com", "https://www.upgrad.com/careers/"),

  seed("Practo", "https://www.practo.com", "https://www.practo.com/company/careers"),
  seed("HealthifyMe", "https://www.healthifyme.com", "https://www.healthifyme.com/careers"),
  seed("MFine", "https://www.mfine.co", "https://mfine.co/careers"),
  seed("MediBuddy", "https://www.medibuddy.in", "https://www.medibuddy.in/careers"),
  seed("Narayana Health", "https://www.narayanahealth.org", "https://www.narayanahealth.org/careers"),
  seed("Manipal Hospitals", "https://www.manipalhospitals.com", "https://www.manipalhospitals.com/careers/"),
  seed("PharmEasy", "https://pharmeasy.in", "https://pharmeasy.in/careers"),

  seed("Biocon", "https://www.biocon.com", "https://www.biocon.com/careers/"),
  seed("Strand Life Sciences", "https://strandls.com", "https://strandls.com/careers/"),
  seed("Bugworks", "https://bugworksresearch.com", "https://bugworksresearch.com/careers/"),
  seed("Molecular Connections", "https://www.molecularconnections.com", "https://www.molecularconnections.com/careers/"),
  seed("Leucine", "https://www.leucine.io", "https://www.leucine.io/careers"),

  seed("Freshworks", "https://www.freshworks.com", "https://www.freshworks.com/company/careers/"),
  seed("Zoho", "https://www.zoho.com", "https://www.zoho.com/careers.html"),
  seed("Thoughtworks", "https://www.thoughtworks.com", "https://www.thoughtworks.com/careers"),
  seed("SAP Labs India", "https://www.sap.com/india", "https://jobs.sap.com"),
  seed("Walmart Global Tech India", "https://tech.walmart.com", "https://careers.walmart.com"),
  seed("Target India", "https://india.target.com", "https://india.target.com/careers"),
  seed("Cisco India", "https://www.cisco.com", "https://jobs.cisco.com"),
  seed("Intel India", "https://www.intel.com", "https://jobs.intel.com"),
  seed("AMD India", "https://www.amd.com", "https://careers.amd.com"),
  seed("NVIDIA India", "https://www.nvidia.com", "https://www.nvidia.com/en-in/about-nvidia/careers/"),
  seed("Qualcomm India", "https://www.qualcomm.com", "https://www.qualcomm.com/company/careers"),
  seed("Adobe India", "https://www.adobe.com", "https://www.adobe.com/careers.html"),
  seed("Atlassian India", "https://www.atlassian.com", "https://www.atlassian.com/company/careers"),
  seed("Okta India", "https://www.okta.com", "https://www.okta.com/company/careers/"),
  seed("Rubrik India", "https://www.rubrik.com", "https://www.rubrik.com/company/careers"),
  seed("Pure Storage India", "https://www.purestorage.com", "https://www.purestorage.com/company/careers.html"),
  seed("Commvault India", "https://www.commvault.com", "https://www.commvault.com/careers"),
  seed("Western Digital India", "https://www.westerndigital.com", "https://www.westerndigital.com/company/careers"),
];

export class BengaluruSeedDiscoverySource implements CompanyDiscoverySource {
  id = "bengaluru-seeds";
  name = "Bengaluru Company Seeds";
  type = "startup_directory" as const;

  async discoverCompanies(
    context: CompanyDiscoveryContext = {},
  ): Promise<DiscoveredCompany[]> {
    const wantsBengaluru =
      !context.city || /bengaluru|bangalore|blr/i.test(context.city);
    const wantsIndia =
      !context.country || /india|in/i.test(context.country);
    if (!wantsBengaluru || !wantsIndia) {
      return [];
    }

    const query = normalizeKey(context.query ?? "");
    const max = Math.min(context.maxResults ?? BENGALURU_SEEDS.length, BENGALURU_SEEDS.length);

    return BENGALURU_SEEDS
      .filter((company) => {
        if (!query) return true;
        return normalizeKey(
          `${company.name} ${company.website} ${company.industries?.join(" ") ?? ""}`,
        ).includes(query);
      })
      .slice(0, max)
      .map(toDiscoveredCompany);
  }
}

function seed(
  name: string,
  website: string,
  careersUrl?: string,
  detectedSource?: BengaluruSeed["detectedSource"],
): BengaluruSeed {
  return {
    name,
    website,
    careersUrl,
    sourceUrl: website,
    startup: true,
    detectedSource,
  };
}

function toDiscoveredCompany(company: BengaluruSeed): DiscoveredCompany {
  return {
    id: `bengaluru-seed:${normalizeKey(company.name).replace(/\s+/g, "-")}`,
    name: company.name,
    source: "Bengaluru Company Seeds",
    sourceType: "startup_directory",
    sourceUrl: company.sourceUrl ?? company.website,
    website: company.website,
    careersUrl: company.careersUrl ?? null,
    logoUrl: null,
    description: null,
    locations: ["Bengaluru, Karnataka, India"],
    city: "Bengaluru",
    country: "India",
    industries: company.industries ?? [],
    tags: [],
    startup: {
      isStartup: company.startup ?? true,
      source: "Bengaluru Company Seeds",
      activelyHiring: undefined,
    },
    detectedSource: company.detectedSource ?? null,
  };
}
