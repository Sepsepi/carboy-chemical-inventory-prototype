import type {
  GhsCode,
  Ingredient,
  Nfpa,
  PhysicalState,
  Product,
  ProductCategory,
  SignalWord,
} from "@/lib/types";

// Chemical names and CAS numbers are real. Manufacturers, product codes and
// every quantity in this prototype are invented.

const WATER: [string, string] = ["Water", "7732-18-5"];

type Ing = [name: string, cas: string, percent: number, tpqLb?: number];

function ing(list: Ing[]): Ingredient[] {
  return list.map(([name, cas, percent, tpqLb]) => ({
    name,
    cas,
    percent,
    ehs: tpqLb !== undefined,
    tpqLb,
  }));
}

function nfpa(h: number, f: number, i: number, special?: Nfpa["special"]): Nfpa {
  return { health: h, flammability: f, instability: i, special } as Nfpa;
}

interface Seed {
  id: string;
  name: string;
  mfr: string;
  code: string;
  cat: ProductCategory;
  state: PhysicalState;
  signal: SignalWord;
  ghs: GhsCode[];
  phys: string[];
  health: string[];
  nfpa: Nfpa;
  un?: string;
  density?: number;
  ing: Ing[];
}

const FLAM = "Flammable (gases, aerosols, liquids, or solids)";
const CORR_METAL = "Corrosive to metal";
const OXID = "Oxidizer (liquid, solid or gas)";
const GAS_P = "Gas under pressure (compressed gas)";
const ACUTE = "Acute toxicity (any route of exposure)";
const SKIN = "Skin corrosion or irritation";
const EYE = "Serious eye damage or eye irritation";
const STOT = "Specific target organ toxicity (single or repeated exposure)";
const CARC = "Carcinogenicity";
const REPRO = "Reproductive toxicity";
const ASP = "Aspiration hazard";
const SENS = "Respiratory or skin sensitization";
const ASPHYX = "Simple asphyxiant";

const SEEDS: Seed[] = [
  // Acids and bases
  { id: "sulfuric-93", name: "Sulfuric Acid 93%", mfr: "Calder Chemical", code: "CC-1830", cat: "Acid", state: "Liquid", signal: "Danger", ghs: ["GHS05"], phys: [CORR_METAL], health: [SKIN, EYE], nfpa: nfpa(3, 0, 2, "W"), un: "UN1830", density: 15.3, ing: [["Sulfuric acid", "7664-93-9", 93, 1000], [...WATER, 7]] },
  { id: "hydrochloric-36", name: "Hydrochloric Acid 36%", mfr: "Calder Chemical", code: "CC-1789", cat: "Acid", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS07"], phys: [CORR_METAL], health: [SKIN, EYE, STOT], nfpa: nfpa(3, 0, 1), un: "UN1789", density: 9.8, ing: [["Hydrogen chloride", "7647-01-0", 36], [...WATER, 64]] },
  { id: "nitric-67", name: "Nitric Acid 67%", mfr: "Calder Chemical", code: "CC-2031", cat: "Acid", state: "Liquid", signal: "Danger", ghs: ["GHS03", "GHS05"], phys: [OXID, CORR_METAL], health: [SKIN, EYE, ACUTE], nfpa: nfpa(4, 0, 0, "OX"), un: "UN2031", density: 11.7, ing: [["Nitric acid", "7697-37-2", 67, 1000], [...WATER, 33]] },
  { id: "phosphoric-75", name: "Phosphoric Acid 75%", mfr: "Harlan Process Chemicals", code: "HP-1805", cat: "Acid", state: "Liquid", signal: "Danger", ghs: ["GHS05"], phys: [CORR_METAL], health: [SKIN, EYE], nfpa: nfpa(3, 0, 0), un: "UN1805", density: 13.2, ing: [["Phosphoric acid", "7664-38-2", 75], [...WATER, 25]] },
  { id: "hydrofluoric-49", name: "Hydrofluoric Acid 49%", mfr: "Meridian Lab Supply", code: "ML-1790", cat: "Acid", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS06"], phys: [CORR_METAL], health: [ACUTE, SKIN, EYE], nfpa: nfpa(4, 0, 1), un: "UN1790", density: 9.7, ing: [["Hydrogen fluoride", "7664-39-3", 49, 100], [...WATER, 51]] },
  { id: "citric-50", name: "Citric Acid 50% Solution", mfr: "Harlan Process Chemicals", code: "HP-0770", cat: "Acid", state: "Liquid", signal: "Warning", ghs: ["GHS07"], phys: [], health: [EYE], nfpa: nfpa(2, 0, 0), density: 10.3, ing: [["Citric acid", "77-92-9", 50], [...WATER, 50]] },
  { id: "caustic-50", name: "Caustic Soda 50%", mfr: "Harlan Process Chemicals", code: "HP-1824", cat: "Base", state: "Liquid", signal: "Danger", ghs: ["GHS05"], phys: [CORR_METAL], health: [SKIN, EYE], nfpa: nfpa(3, 0, 1), un: "UN1824", density: 12.7, ing: [["Sodium hydroxide", "1310-73-2", 50], [...WATER, 50]] },
  { id: "koh-45", name: "Potassium Hydroxide 45%", mfr: "Harlan Process Chemicals", code: "HP-1814", cat: "Base", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS07"], phys: [CORR_METAL], health: [ACUTE, SKIN, EYE], nfpa: nfpa(3, 0, 1), un: "UN1814", density: 12.1, ing: [["Potassium hydroxide", "1310-58-3", 45], [...WATER, 55]] },
  { id: "aqua-ammonia-19", name: "Aqua Ammonia 19%", mfr: "Bluewater Treatment", code: "BW-2672", cat: "Base", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS07", "GHS09"], phys: [], health: [SKIN, EYE, STOT], nfpa: nfpa(3, 1, 0), un: "UN2672", density: 7.7, ing: [["Ammonia", "7664-41-7", 19, 500], [...WATER, 81]] },
  { id: "soda-ash", name: "Soda Ash, Dense", mfr: "Harlan Process Chemicals", code: "HP-0497", cat: "Raw material", state: "Solid", signal: "Warning", ghs: ["GHS07"], phys: [], health: [EYE], nfpa: nfpa(2, 0, 0), ing: [["Sodium carbonate", "497-19-8", 99.2]] },

  // Water treatment and oxidizers
  { id: "anhydrous-ammonia", name: "Anhydrous Ammonia", mfr: "Tri-County Gas & Supply", code: "TG-1005", cat: "Compressed gas", state: "Gas", signal: "Danger", ghs: ["GHS04", "GHS05", "GHS06", "GHS09"], phys: [GAS_P, FLAM], health: [ACUTE, SKIN, EYE], nfpa: nfpa(3, 1, 0), un: "UN1005", ing: [["Ammonia", "7664-41-7", 99.5, 500]] },
  { id: "hypochlorite-125", name: "Sodium Hypochlorite 12.5%", mfr: "Bluewater Treatment", code: "BW-1791", cat: "Water treatment", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS09"], phys: [CORR_METAL], health: [SKIN, EYE], nfpa: nfpa(2, 0, 1), un: "UN1791", density: 10.0, ing: [["Sodium hypochlorite", "7681-52-9", 12.5], ["Sodium hydroxide", "1310-73-2", 0.8], [...WATER, 86.7]] },
  { id: "chlorine", name: "Chlorine, Liquefied", mfr: "Bluewater Treatment", code: "BW-1017", cat: "Water treatment", state: "Gas", signal: "Danger", ghs: ["GHS03", "GHS04", "GHS06", "GHS09"], phys: [OXID, GAS_P], health: [ACUTE, SKIN, EYE, STOT], nfpa: nfpa(4, 0, 0, "OX"), un: "UN1017", ing: [["Chlorine", "7782-50-5", 99.5, 100]] },
  { id: "ferric-chloride-40", name: "Ferric Chloride 40%", mfr: "Bluewater Treatment", code: "BW-2582", cat: "Water treatment", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS07"], phys: [CORR_METAL], health: [ACUTE, SKIN, EYE], nfpa: nfpa(3, 0, 0), un: "UN2582", density: 11.9, ing: [["Ferric chloride", "7705-08-0", 40], ["Hydrogen chloride", "7647-01-0", 1], [...WATER, 59]] },
  { id: "bisulfite-38", name: "Sodium Bisulfite 38%", mfr: "Bluewater Treatment", code: "BW-2693", cat: "Water treatment", state: "Liquid", signal: "Warning", ghs: ["GHS07"], phys: [], health: [ACUTE, EYE], nfpa: nfpa(2, 0, 1), un: "UN2693", density: 11.0, ing: [["Sodium bisulfite", "7631-90-5", 38], [...WATER, 62]] },
  { id: "alum-48", name: "Aluminum Sulfate 48%", mfr: "Bluewater Treatment", code: "BW-1004", cat: "Water treatment", state: "Liquid", signal: "Danger", ghs: ["GHS05"], phys: [CORR_METAL], health: [EYE], nfpa: nfpa(2, 0, 0), density: 11.1, ing: [["Aluminum sulfate", "10043-01-3", 48], [...WATER, 52]] },
  { id: "peroxide-35", name: "Hydrogen Peroxide 35%", mfr: "Calder Chemical", code: "CC-2014", cat: "Oxidizer", state: "Liquid", signal: "Danger", ghs: ["GHS03", "GHS05", "GHS07"], phys: [OXID], health: [ACUTE, SKIN, EYE], nfpa: nfpa(3, 0, 1, "OX"), un: "UN2014", density: 9.4, ing: [["Hydrogen peroxide", "7722-84-1", 35], [...WATER, 65]] },
  { id: "cal-hypo-68", name: "Calcium Hypochlorite 68%, Granular", mfr: "Bluewater Treatment", code: "BW-2880", cat: "Oxidizer", state: "Solid", signal: "Danger", ghs: ["GHS03", "GHS05", "GHS07", "GHS09"], phys: [OXID], health: [ACUTE, SKIN, EYE], nfpa: nfpa(3, 0, 1, "OX"), un: "UN2880", ing: [["Calcium hypochlorite", "7778-54-3", 68], ["Sodium chloride", "7647-14-5", 18], ["Calcium hydroxide", "1305-62-0", 4]] },
  { id: "formalin-37", name: "Formaldehyde 37% (Formalin)", mfr: "Harlan Process Chemicals", code: "HP-2209", cat: "Raw material", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS06", "GHS08"], phys: [], health: [ACUTE, CARC, SKIN, EYE, SENS], nfpa: nfpa(3, 2, 0), un: "UN2209", density: 9.2, ing: [["Formaldehyde", "50-00-0", 37, 500], ["Methanol", "67-56-1", 12], [...WATER, 51]] },

  // Solvents
  { id: "acetone", name: "Acetone", mfr: "Northfield Solvents", code: "NS-1090", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07"], phys: [FLAM], health: [EYE, STOT], nfpa: nfpa(1, 3, 0), un: "UN1090", density: 6.6, ing: [["Acetone", "67-64-1", 99.5]] },
  { id: "toluene", name: "Toluene", mfr: "Northfield Solvents", code: "NS-1294", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08"], phys: [FLAM], health: [ASP, REPRO, SKIN, STOT], nfpa: nfpa(2, 3, 0), un: "UN1294", density: 7.2, ing: [["Toluene", "108-88-3", 99.8]] },
  { id: "xylene", name: "Xylene, Mixed Isomers", mfr: "Northfield Solvents", code: "NS-1307", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08"], phys: [FLAM], health: [ASP, SKIN, EYE, STOT], nfpa: nfpa(2, 3, 0), un: "UN1307", density: 7.2, ing: [["Xylene", "1330-20-7", 81], ["Ethylbenzene", "100-41-4", 18.5]] },
  { id: "methanol", name: "Methanol", mfr: "Northfield Solvents", code: "NS-1230", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS06", "GHS08"], phys: [FLAM], health: [ACUTE, STOT], nfpa: nfpa(1, 3, 0), un: "UN1230", density: 6.6, ing: [["Methanol", "67-56-1", 99.9]] },
  { id: "ipa-99", name: "Isopropyl Alcohol 99%", mfr: "Northfield Solvents", code: "NS-1219", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07"], phys: [FLAM], health: [EYE, STOT], nfpa: nfpa(1, 3, 0), un: "UN1219", density: 6.5, ing: [["Isopropyl alcohol", "67-63-0", 99], [...WATER, 1]] },
  { id: "mek", name: "Methyl Ethyl Ketone", mfr: "Northfield Solvents", code: "NS-1193", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07"], phys: [FLAM], health: [EYE, STOT], nfpa: nfpa(1, 3, 0), un: "UN1193", density: 6.7, ing: [["Methyl ethyl ketone", "78-93-3", 99.5]] },
  { id: "hexane", name: "n-Hexane", mfr: "Northfield Solvents", code: "NS-1208", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08", "GHS09"], phys: [FLAM], health: [ASP, REPRO, SKIN, STOT], nfpa: nfpa(1, 3, 0), un: "UN1208", density: 5.5, ing: [["n-Hexane", "110-54-3", 95], ["Methylcyclopentane", "96-37-7", 4]] },
  { id: "ethyl-acetate", name: "Ethyl Acetate", mfr: "Northfield Solvents", code: "NS-1173", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07"], phys: [FLAM], health: [EYE, STOT], nfpa: nfpa(1, 3, 0), un: "UN1173", density: 7.5, ing: [["Ethyl acetate", "141-78-6", 99.5]] },
  { id: "mineral-spirits", name: "Mineral Spirits", mfr: "Northfield Solvents", code: "NS-1268", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08"], phys: [FLAM], health: [ASP, SKIN, STOT], nfpa: nfpa(1, 2, 0), un: "UN1268", density: 6.4, ing: [["Stoddard solvent", "8052-41-3", 100]] },
  { id: "ethanol-190", name: "Denatured Ethanol, 190 Proof", mfr: "Northfield Solvents", code: "NS-1987", cat: "Solvent", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07"], phys: [FLAM], health: [EYE], nfpa: nfpa(2, 3, 0), un: "UN1987", density: 6.8, ing: [["Ethanol", "64-17-5", 91], ["Methanol", "67-56-1", 4], [...WATER, 5]] },
  { id: "glycol-ether-eb", name: "Glycol Ether EB", mfr: "Northfield Solvents", code: "NS-2369", cat: "Solvent", state: "Liquid", signal: "Warning", ghs: ["GHS07"], phys: [], health: [ACUTE, SKIN, EYE], nfpa: nfpa(2, 2, 0), density: 7.5, ing: [["2-Butoxyethanol", "111-76-2", 99.5]] },
  { id: "perc", name: "Perchloroethylene", mfr: "Northfield Solvents", code: "NS-1897", cat: "Solvent", state: "Liquid", signal: "Warning", ghs: ["GHS07", "GHS08", "GHS09"], phys: [], health: [CARC, SKIN, EYE, STOT], nfpa: nfpa(2, 0, 0), un: "UN1897", density: 13.5, ing: [["Tetrachloroethylene", "127-18-4", 99.9]] },
  { id: "ethylene-glycol", name: "Ethylene Glycol, Industrial", mfr: "Harlan Process Chemicals", code: "HP-0107", cat: "Raw material", state: "Liquid", signal: "Warning", ghs: ["GHS07", "GHS08"], phys: [], health: [ACUTE, STOT], nfpa: nfpa(2, 1, 0), density: 9.3, ing: [["Ethylene glycol", "107-21-1", 99.5]] },
  { id: "styrene", name: "Styrene Monomer, Inhibited", mfr: "Harlan Process Chemicals", code: "HP-2055", cat: "Raw material", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08"], phys: [FLAM], health: [ASP, REPRO, SKIN, EYE, STOT], nfpa: nfpa(2, 3, 2), un: "UN2055", density: 7.6, ing: [["Styrene", "100-42-5", 99.8]] },

  // Fuels and lubricants
  { id: "diesel", name: "Ultra-Low Sulfur Diesel No. 2", mfr: "Sabine Petroleum Products", code: "SP-1202", cat: "Fuel", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08", "GHS09"], phys: [FLAM], health: [ASP, CARC, SKIN, STOT], nfpa: nfpa(1, 2, 0), un: "UN1202", density: 7.1, ing: [["Fuels, diesel, No. 2", "68476-34-6", 100]] },
  { id: "gasoline", name: "Unleaded Gasoline 87", mfr: "Sabine Petroleum Products", code: "SP-1203", cat: "Fuel", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08", "GHS09"], phys: [FLAM], health: [ASP, CARC, REPRO, SKIN, STOT], nfpa: nfpa(1, 3, 0), un: "UN1203", density: 6.2, ing: [["Gasoline", "86290-81-5", 72], ["Ethanol", "64-17-5", 10], ["Toluene", "108-88-3", 8], ["Xylene", "1330-20-7", 6.5], ["Benzene", "71-43-2", 1.5]] },
  { id: "propane", name: "Propane (LPG)", mfr: "Tri-County Gas & Supply", code: "TG-1075", cat: "Fuel", state: "Gas", signal: "Danger", ghs: ["GHS02", "GHS04"], phys: [FLAM, GAS_P], health: [ASPHYX], nfpa: nfpa(2, 4, 0), un: "UN1075", ing: [["Propane", "74-98-6", 96], ["Propylene", "115-07-1", 3]] },
  { id: "hydraulic-aw46", name: "Hydraulic Oil AW 46", mfr: "Ardent Lubricants", code: "AL-0046", cat: "Lubricant", state: "Liquid", signal: null, ghs: [], phys: [], health: [], nfpa: nfpa(0, 1, 0), density: 7.3, ing: [["Distillates (petroleum), hydrotreated heavy paraffinic", "64742-54-7", 97], ["Zinc dialkyldithiophosphate", "68649-42-3", 1]] },
  { id: "antifreeze-5050", name: "Antifreeze and Coolant 50/50", mfr: "Ardent Lubricants", code: "AL-5050", cat: "Lubricant", state: "Liquid", signal: "Warning", ghs: ["GHS07", "GHS08"], phys: [], health: [ACUTE, STOT], nfpa: nfpa(2, 1, 0), density: 8.9, ing: [["Ethylene glycol", "107-21-1", 50], [...WATER, 48]] },
  { id: "lead-acid-battery", name: "Lead-Acid Batteries, Industrial", mfr: "Voltcore Industrial", code: "VI-2794", cat: "Battery", state: "Solid", signal: "Danger", ghs: ["GHS05", "GHS08", "GHS09"], phys: [CORR_METAL], health: [CARC, REPRO, SKIN, EYE, STOT], nfpa: nfpa(3, 0, 2, "W"), un: "UN2794", ing: [["Lead", "7439-92-1", 63], ["Sulfuric acid", "7664-93-9", 18, 1000], [...WATER, 12]] },

  // Compressed gases
  { id: "nitrogen", name: "Nitrogen, Compressed", mfr: "Tri-County Gas & Supply", code: "TG-1066", cat: "Compressed gas", state: "Gas", signal: "Warning", ghs: ["GHS04"], phys: [GAS_P], health: [ASPHYX], nfpa: nfpa(0, 0, 0, "SA"), un: "UN1066", ing: [["Nitrogen", "7727-37-9", 99.9]] },
  { id: "argon", name: "Argon, Compressed", mfr: "Tri-County Gas & Supply", code: "TG-1006", cat: "Compressed gas", state: "Gas", signal: "Warning", ghs: ["GHS04"], phys: [GAS_P], health: [ASPHYX], nfpa: nfpa(0, 0, 0, "SA"), un: "UN1006", ing: [["Argon", "7440-37-1", 99.9]] },
  { id: "oxygen", name: "Oxygen, Compressed", mfr: "Tri-County Gas & Supply", code: "TG-1072", cat: "Compressed gas", state: "Gas", signal: "Danger", ghs: ["GHS03", "GHS04"], phys: [OXID, GAS_P], health: [], nfpa: nfpa(0, 0, 0, "OX"), un: "UN1072", ing: [["Oxygen", "7782-44-7", 99.5]] },
  { id: "acetylene", name: "Acetylene, Dissolved", mfr: "Tri-County Gas & Supply", code: "TG-1001", cat: "Compressed gas", state: "Gas", signal: "Danger", ghs: ["GHS02", "GHS04"], phys: [FLAM, GAS_P], health: [ASPHYX], nfpa: nfpa(1, 4, 3), un: "UN1001", ing: [["Acetylene", "74-86-2", 99], ["Acetone", "67-64-1", 1]] },
  { id: "co2", name: "Carbon Dioxide, Refrigerated Liquid", mfr: "Tri-County Gas & Supply", code: "TG-2187", cat: "Compressed gas", state: "Gas", signal: "Warning", ghs: ["GHS04"], phys: [GAS_P], health: [ASPHYX], nfpa: nfpa(2, 0, 0, "SA"), un: "UN2187", ing: [["Carbon dioxide", "124-38-9", 99.9]] },

  // Coatings, cleaning and bulk solids
  { id: "epoxy-primer-a", name: "KC-420 Epoxy Primer, Part A", mfr: "Kestrel Coatings", code: "KC-420A", cat: "Coating", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08", "GHS09"], phys: [FLAM], health: [SKIN, EYE, SENS, STOT], nfpa: nfpa(2, 3, 0), un: "UN1263", density: 10.8, ing: [["Bisphenol A epoxy resin", "25068-38-6", 44], ["Xylene", "1330-20-7", 20], ["Titanium dioxide", "13463-67-7", 15], ["Talc", "14807-96-6", 12], ["n-Butanol", "71-36-3", 8]] },
  { id: "pu-hardener", name: "KC-880 Polyurethane Hardener", mfr: "Kestrel Coatings", code: "KC-880B", cat: "Coating", state: "Liquid", signal: "Danger", ghs: ["GHS02", "GHS07", "GHS08"], phys: [FLAM], health: [ACUTE, SKIN, EYE, SENS, STOT], nfpa: nfpa(2, 3, 1), un: "UN1263", density: 9.1, ing: [["Hexamethylene diisocyanate homopolymer", "28182-81-2", 70], ["n-Butyl acetate", "123-86-4", 29.5], ["Hexamethylene diisocyanate", "822-06-0", 0.3]] },
  { id: "hd-degreaser", name: "Ardent HD Degreaser", mfr: "Ardent Lubricants", code: "AL-7710", cat: "Cleaning", state: "Liquid", signal: "Danger", ghs: ["GHS05", "GHS07"], phys: [], health: [SKIN, EYE], nfpa: nfpa(2, 0, 0), density: 8.7, ing: [["2-Butoxyethanol", "111-76-2", 8], ["Sodium metasilicate", "6834-92-0", 4], ["Alcohols, C9-11, ethoxylated", "68439-46-3", 3], [...WATER, 85]] },
  { id: "portland-cement", name: "Portland Cement, Type I/II", mfr: "Ridgeline Materials", code: "RM-0650", cat: "Raw material", state: "Solid", signal: "Danger", ghs: ["GHS05", "GHS07", "GHS08"], phys: [], health: [CARC, SKIN, EYE, SENS, STOT], nfpa: nfpa(2, 0, 0), ing: [["Portland cement", "65997-15-1", 93], ["Calcium sulfate dihydrate", "13397-24-5", 4], ["Crystalline silica (quartz)", "14808-60-7", 3]] },
];

export const PRODUCTS: Product[] = SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  manufacturer: s.mfr,
  productCode: s.code,
  category: s.cat,
  physicalState: s.state,
  signalWord: s.signal,
  pictograms: s.ghs,
  physicalHazards: s.phys,
  healthHazards: s.health,
  nfpa: s.nfpa,
  unNumber: s.un,
  densityLbGal: s.density,
  ingredients: ing(s.ing),
}));

/**
 * Latest SDS revision per product (the date printed on the sheet) and how many
 * earlier versions the library holds. `null` means no SDS is on file.
 */
export const SDS_SEED: Record<string, { rev: string; versions: number; bilingual?: boolean } | null> = {
  "sulfuric-93": { rev: "2024-03-12", versions: 4, bilingual: true },
  "hydrochloric-36": { rev: "2023-09-05", versions: 3, bilingual: true },
  "nitric-67": { rev: "2025-01-21", versions: 4 },
  "phosphoric-75": { rev: "2022-01-18", versions: 2 },
  "hydrofluoric-49": { rev: "2025-06-30", versions: 3 },
  "citric-50": null,
  "caustic-50": { rev: "2024-11-04", versions: 5, bilingual: true },
  "koh-45": { rev: "2022-02-14", versions: 2 },
  "aqua-ammonia-19": { rev: "2023-04-19", versions: 3 },
  "soda-ash": { rev: "2019-02-08", versions: 1 },
  "anhydrous-ammonia": { rev: "2025-08-11", versions: 4, bilingual: true },
  "hypochlorite-125": { rev: "2024-07-23", versions: 3, bilingual: true },
  chlorine: { rev: "2026-02-03", versions: 5, bilingual: true },
  "ferric-chloride-40": { rev: "2021-03-17", versions: 2 },
  "bisulfite-38": { rev: "2023-12-01", versions: 2 },
  "alum-48": { rev: "2017-11-02", versions: 1 },
  "peroxide-35": { rev: "2025-03-27", versions: 3 },
  "cal-hypo-68": { rev: "2021-07-29", versions: 2 },
  "formalin-37": { rev: "2026-05-14", versions: 4 },
  acetone: { rev: "2025-10-02", versions: 4, bilingual: true },
  toluene: { rev: "2024-05-16", versions: 4 },
  xylene: { rev: "2024-05-16", versions: 3 },
  methanol: { rev: "2026-01-09", versions: 5, bilingual: true },
  "ipa-99": { rev: "2023-06-28", versions: 3 },
  mek: { rev: "2022-08-30", versions: 2 },
  hexane: { rev: "2023-02-10", versions: 2 },
  "ethyl-acetate": { rev: "2024-09-18", versions: 2 },
  "mineral-spirits": { rev: "2020-08-05", versions: 2 },
  "ethanol-190": { rev: "2025-04-08", versions: 3 },
  "glycol-ether-eb": { rev: "2022-03-03", versions: 2 },
  perc: { rev: "2021-10-11", versions: 3 },
  "ethylene-glycol": { rev: "2023-10-25", versions: 3 },
  styrene: { rev: "2025-11-19", versions: 4 },
  diesel: { rev: "2024-02-06", versions: 4, bilingual: true },
  gasoline: { rev: "2024-02-06", versions: 4, bilingual: true },
  propane: { rev: "2023-07-14", versions: 3, bilingual: true },
  "hydraulic-aw46": { rev: "2020-01-22", versions: 1 },
  "antifreeze-5050": { rev: "2022-04-26", versions: 2 },
  "lead-acid-battery": { rev: "2019-09-30", versions: 2 },
  nitrogen: { rev: "2024-10-15", versions: 3 },
  argon: { rev: "2024-10-15", versions: 2 },
  oxygen: { rev: "2024-10-15", versions: 3 },
  acetylene: { rev: "2021-12-09", versions: 2 },
  co2: { rev: "2023-03-22", versions: 2 },
  "epoxy-primer-a": { rev: "2025-09-09", versions: 3 },
  "pu-hardener": { rev: "2025-09-09", versions: 3 },
  "hd-degreaser": null,
  "portland-cement": { rev: "2018-06-14", versions: 1 },
};
