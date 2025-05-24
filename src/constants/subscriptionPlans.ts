import { Building2, Rocket, Shield, Users } from "lucide-react";
import Plan from "../types/plan";

  const plans: Plan[] = [
    {
      id: "free_plan",
      name: "Free Plan",
      description: "Basic access to Health Rocket",
      price: 0,
      interval: "month",
      features: [
        "Access to all basic features",
        "Daily boosts and challenges",
        "Health tracking",
        "Community access",
        "Prize Pool Rewards not included",
      ],
      price_id: "price_1Qt7haHPnFqUVCZdl33y9bET",
      is_active: true,
      icon: Rocket,
      comingSoon: false,
    },
    {
      id: "pro_plan",
      name: "Pro Plan",
      description: "Full access to all features",
      price: 59.95,
      interval: "month",
      features: [
        "All Free Plan features",
        "Premium challenges and quests",
        "Prize pool eligibility",
        "Advanced health analytics",
        "60-day free trial",
      ],
      price_id: "price_1Qt7jVHPnFqUVCZdutw3mSWN",
      is_active: true,
      icon: Shield,
      comingSoon: false,
    },
    {
      id: "family_plan",
      name: "Pro + Family",
      description: "Share with up to 5 family members",
      price: 89.95,
      interval: "month",
      features: [
        "All Pro Plan features",
        "Up to 5 family members",
        "Family challenges and competitions",
        "Family leaderboard",
        "Shared progress tracking",
      ],
      price_id: "price_1Qt7lXHPnFqUVCZdlpS1vrfs",
      is_active: true,
      icon: Users,
      comingSoon: true,
    },
    {
      id: "team_plan",
      name: "Pro + Team",
      description: "For teams and organizations",
      price: 149.95,
      interval: "month",
      features: [
        "All Pro Plan features",
        "Up to 20 team members",
        "Team challenges and competitions",
        "Team analytics dashboard",
        "Admin controls and reporting",
      ],
      price_id: "price_1Qt7mVHPnFqUVCZdqvWROuTD",
      is_active: true,
      icon: Building2,
      comingSoon: true,
    },
  ];

  export default plans;