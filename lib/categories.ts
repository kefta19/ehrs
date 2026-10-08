import type { PrismaClient } from "@/app/generated/prisma/client";

export type AttributeField = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  unit?: string;
  required?: boolean;
};

export type CategoryDef = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  sortOrder: number;
  /** Extra fields stored in Listing.attributes for this category. */
  attributes: AttributeField[];
};

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    slug: "homes",
    name: "Homes",
    icon: "🏠",
    description: "Houses, apartments and residential units",
    sortOrder: 1,
    attributes: [
      {
        key: "propertyType",
        label: "Property type",
        type: "select",
        options: ["House", "Apartment", "Villa", "Condominium"],
        required: true,
      },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      {
        key: "buildingSizeSqm",
        label: "Building size",
        type: "number",
        unit: "m²",
      },
      { key: "lotSizeSqm", label: "Lot size", type: "number", unit: "m²" },
      { key: "yearBuilt", label: "Year built", type: "number" },
    ],
  },
  {
    slug: "cars-vehicles",
    name: "Cars & Vehicles",
    icon: "🚗",
    description: "Cars, trucks, buses, motorcycles and other vehicles",
    sortOrder: 2,
    attributes: [
      { key: "make", label: "Make", type: "text", required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "year", label: "Year", type: "number", required: true },
      { key: "mileageKm", label: "Mileage", type: "number", unit: "km" },
      {
        key: "transmission",
        label: "Transmission",
        type: "select",
        options: ["Manual", "Automatic"],
      },
      {
        key: "fuelType",
        label: "Fuel type",
        type: "select",
        options: ["Petrol", "Diesel", "Electric", "Hybrid"],
      },
      { key: "plateNumber", label: "Plate number", type: "text" },
    ],
  },
  {
    slug: "land",
    name: "Land",
    icon: "🌳",
    description: "Plots, farmland and undeveloped land",
    sortOrder: 3,
    attributes: [
      {
        key: "plotSizeSqm",
        label: "Plot size",
        type: "number",
        unit: "m²",
        required: true,
      },
      {
        key: "zoning",
        label: "Zoning",
        type: "select",
        options: ["Residential", "Commercial", "Agricultural", "Mixed use"],
      },
      { key: "titleType", label: "Title type", type: "text" },
    ],
  },
  {
    slug: "commercial",
    name: "Commercial",
    icon: "🏢",
    description: "Offices, shops, hotels and other commercial property",
    sortOrder: 4,
    attributes: [
      {
        key: "buildingType",
        label: "Building type",
        type: "select",
        options: ["Office", "Shop", "Hotel", "Warehouse", "Other"],
        required: true,
      },
      { key: "floorAreaSqm", label: "Floor area", type: "number", unit: "m²" },
      { key: "floors", label: "Floors", type: "number" },
      { key: "yearBuilt", label: "Year built", type: "number" },
    ],
  },
  {
    slug: "industrial",
    name: "Industrial",
    icon: "🏭",
    description: "Factories, plants, machinery and industrial sites",
    sortOrder: 5,
    attributes: [
      {
        key: "assetType",
        label: "Asset type",
        type: "select",
        options: ["Factory", "Plant", "Machinery", "Industrial land"],
        required: true,
      },
      { key: "floorAreaSqm", label: "Floor area", type: "number", unit: "m²" },
      {
        key: "powerCapacityKw",
        label: "Power capacity",
        type: "number",
        unit: "kW",
      },
    ],
  },
  {
    slug: "other-assets",
    name: "Other Assets",
    icon: "📦",
    description: "Anything else that does not fit the categories above",
    sortOrder: 6,
    attributes: [],
  },
];

export const getAttributeFields = (slug: string): AttributeField[] =>
  CATEGORY_DEFS.find((c) => c.slug === slug)?.attributes ?? [];

/** Idempotent. Safe to run on every deploy; never changes isActive. */
export async function seedCategories(db: PrismaClient): Promise<number> {
  for (const c of CATEGORY_DEFS) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        description: c.description,
        sortOrder: c.sortOrder,
      },
      update: {
        name: c.name,
        icon: c.icon,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });
  }
  return CATEGORY_DEFS.length;
}
