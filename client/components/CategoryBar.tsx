import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  ShoppingCart,
  Building,
  Calendar,
  Users,
  Settings,
  Store,
  MapPin,
  Bed,
} from "lucide-react";

interface CategoryButton {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  description: string;
}

const categoryButtons: CategoryButton[] = [
  {
    name: "Buy Property",
    path: "/buy",
    icon: Home,
    description: "Find your dream home",
  },
  {
    name: "For Sale",
    path: "/sale",
    icon: Store,
    description: "Sell your property",
  },
  {
    name: "Rent Property",
    path: "/rent",
    icon: Building,
    description: "Rent homes & offices",
  },
  {
    name: "Lease Property",
    path: "/lease",
    icon: Calendar,
    description: "Long-term leasing",
  },
  {
    name: "PG & Hostels",
    path: "/pg",
    icon: Bed,
    description: "Paying guest accommodations",
  },
  {
    name: "Other Services",
    path: "/other-services",
    icon: Settings,
    description: "Property related services",
  },
];

export default function CategoryBar() {
  const location = useLocation();

  return (
    <div className="bg-white">
      <div className="px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryButtons.map((category) => {
            const isActive = location.pathname === category.path;
            const IconComponent = category.icon;

            return (
              <Link
                key={category.path}
                to={category.path}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl text-center transition-all duration-200",
                  "border border-gray-200 hover:shadow-lg hover:scale-105 hover:-translate-y-1",
                  "active:scale-95 transform min-h-[120px] justify-center",
                  isActive
                    ? "bg-[#C70000] text-white border-[#C70000] shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300",
                )}
              >
                <IconComponent
                  className={cn(
                    "h-8 w-8 mb-2",
                    isActive ? "text-white" : "text-[#C70000]",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-semibold mb-1",
                    isActive ? "text-white" : "text-gray-900",
                  )}
                >
                  {category.name}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    isActive ? "text-red-100" : "text-gray-500",
                  )}
                >
                  {category.description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
