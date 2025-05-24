interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
  price_id: string;
  is_active: boolean;
  icon: React.ComponentType<any>;
  comingSoon: boolean;
  trialDays?: number;
  promoCode?: boolean;
}
export default Plan;