import type { Frequency, Kind, SectionId } from "./types";

export type CatalogItem = {
  id: string;
  section: SectionId;
  name: string;
  frequency: Frequency;
  kind: Kind;
  amountCents: number | null;
};

function line(
  id: string,
  section: SectionId,
  name: string,
  frequency: Frequency,
  kind: Kind,
): CatalogItem {
  return {
    id,
    section,
    name,
    frequency,
    kind,
    amountCents: null,
  };
}

/**
 * MoneySmart budget planner categories, in sheet order, with no amounts.
 * Kind is the non-discretionary split: essentials, discretionary, or set aside.
 * Figures are entered in the app and stored only in the local database.
 */
export const CATALOG: CatalogItem[] = [
  line("income-yours", "income", "Your take-home pay", "monthly", "income"),
  line("income-partner", "income", "Your partner's take-home pay", "weekly", "income"),
  line("income-bonus", "income", "Bonuses / overtime", "annually", "income"),
  line("income-investments", "income", "Income from savings and investments", "monthly", "income"),
  line("income-centrelink", "income", "Centrelink benefits", "fortnightly", "income"),
  line("income-family", "income", "Family benefit payments", "fortnightly", "income"),
  line("income-child-support", "income", "Child support received", "monthly", "income"),
  line("income-other", "income", "Other", "monthly", "income"),

  line("home-mortgage", "home", "Mortgage & rent", "monthly", "essential"),
  line("home-body-corporate", "home", "Body corporate fees", "quarterly", "essential"),
  line("home-rates", "home", "Council rates", "quarterly", "essential"),
  line("home-furniture", "home", "Furniture & appliances", "annually", "discretionary"),
  line("home-maintenance", "home", "Renovations & maintenance", "annually", "essential"),
  line("home-electricity", "home", "Electricity", "quarterly", "essential"),
  line("home-gas", "home", "Gas", "quarterly", "essential"),
  line("home-water", "home", "Water", "quarterly", "essential"),
  line("home-internet", "home", "Internet", "monthly", "essential"),
  line("home-pay-tv", "home", "Pay TV", "monthly", "discretionary"),
  line("home-phone", "home", "Home phone", "monthly", "essential"),
  line("home-mobile", "home", "Mobile", "monthly", "essential"),
  line("home-other", "home", "Other", "fortnightly", "essential"),

  line("insurance-car", "insurance", "Car insurance", "monthly", "essential"),
  line("insurance-home", "insurance", "Home & contents insurance", "monthly", "essential"),
  line("insurance-life", "insurance", "Personal & life insurance", "monthly", "essential"),
  line("insurance-health", "insurance", "Health insurance", "monthly", "essential"),
  line("insurance-car-loan", "insurance", "Car loan", "monthly", "essential"),
  line("insurance-card", "insurance", "Credit card interest", "monthly", "essential"),
  line("insurance-loans", "insurance", "Other loans", "monthly", "essential"),
  line("insurance-debt", "insurance", "Paying off debt", "monthly", "essential"),
  line("insurance-savings", "insurance", "Savings", "monthly", "set_aside"),
  line("insurance-super", "insurance", "Investments & super contributions", "monthly", "set_aside"),
  line("insurance-charity", "insurance", "Charity donations", "monthly", "discretionary"),
  line("insurance-other", "insurance", "Other", "monthly", "essential"),

  line("groceries-supermarket", "groceries", "Supermarket", "weekly", "essential"),
  line("groceries-butcher", "groceries", "Butcher", "weekly", "essential"),
  line("groceries-fruit", "groceries", "Fruit & veg market", "weekly", "essential"),
  line("groceries-fish", "groceries", "Fish shop", "weekly", "essential"),
  line("groceries-deli", "groceries", "Deli & bakery", "weekly", "essential"),
  line("groceries-pet-food", "groceries", "Pet food", "weekly", "essential"),
  line("groceries-other", "groceries", "Other", "monthly", "essential"),

  line("personal-cosmetics", "personal", "Cosmetics & toiletries", "monthly", "discretionary"),
  line("personal-hair", "personal", "Hair & beauty", "monthly", "discretionary"),
  line("personal-pharmacy", "personal", "Medicines & pharmacy", "monthly", "essential"),
  line("personal-glasses", "personal", "Glasses & eye care", "monthly", "essential"),
  line("personal-dental", "personal", "Dental", "monthly", "essential"),
  line("personal-doctors", "personal", "Doctors & medical", "monthly", "essential"),
  line("personal-hobbies", "personal", "Hobbies", "monthly", "discretionary"),
  line("personal-clothing", "personal", "Clothing & shoes", "monthly", "discretionary"),
  line("personal-jewellery", "personal", "Jewellery & accessories", "monthly", "discretionary"),
  line("personal-gadgets", "personal", "Computers & gadgets", "monthly", "discretionary"),
  line("personal-gym", "personal", "Sports & gym", "monthly", "discretionary"),
  line("personal-education", "personal", "Education", "monthly", "essential"),
  line("personal-vet", "personal", "Pet care & vet", "monthly", "essential"),
  line("personal-other", "personal", "Other", "monthly", "discretionary"),

  line("entertainment-coffee", "entertainment", "Coffee & tea", "weekly", "discretionary"),
  line("entertainment-lunches", "entertainment", "Lunches bought", "weekly", "discretionary"),
  line("entertainment-takeaway", "entertainment", "Take-away & snacks", "weekly", "discretionary"),
  line("entertainment-cigarettes", "entertainment", "Cigarettes", "weekly", "discretionary"),
  line("entertainment-alcohol", "entertainment", "Drinks & alcohol", "weekly", "discretionary"),
  line("entertainment-bars", "entertainment", "Bars & clubs", "monthly", "discretionary"),
  line("entertainment-restaurants", "entertainment", "Restaurants", "monthly", "discretionary"),
  line("entertainment-books", "entertainment", "Books", "monthly", "discretionary"),
  line("entertainment-papers", "entertainment", "Newspapers & magazines", "monthly", "discretionary"),
  line("entertainment-movies", "entertainment", "Movies & music", "monthly", "discretionary"),
  line("entertainment-holidays", "entertainment", "Holidays", "annually", "discretionary"),
  line("entertainment-gifts", "entertainment", "Celebrations & gifts", "monthly", "discretionary"),
  line("entertainment-other", "entertainment", "Other", "monthly", "discretionary"),

  line("transport-public", "transport", "Bus & train & ferry", "weekly", "essential"),
  line("transport-petrol", "transport", "Petrol", "weekly", "essential"),
  line("transport-tolls", "transport", "Road tolls & parking", "weekly", "essential"),
  line("transport-rego", "transport", "Rego & licence", "annually", "essential"),
  line("transport-repairs", "transport", "Repairs & maintenance", "annually", "essential"),
  line("transport-fines", "transport", "Fines", "monthly", "essential"),
  line("transport-airfares", "transport", "Airfares", "annually", "discretionary"),
  line("transport-other", "transport", "Other", "monthly", "essential"),

  line("children-baby", "children", "Baby products", "monthly", "essential"),
  line("children-toys", "children", "Toys", "monthly", "discretionary"),
  line("children-babysitting", "children", "Babysitting", "monthly", "essential"),
  line("children-childcare", "children", "Childcare", "monthly", "essential"),
  line("children-sports", "children", "Sports & activities", "monthly", "discretionary"),
  line("children-fees", "children", "School fees", "monthly", "essential"),
  line("children-excursions", "children", "Excursions", "monthly", "essential"),
  line("children-uniforms", "children", "School uniforms", "monthly", "essential"),
  line("children-school-other", "children", "Other school needs", "monthly", "essential"),
  line("children-support", "children", "Child support payment", "monthly", "essential"),
  line("children-other", "children", "Other", "monthly", "essential"),
];
