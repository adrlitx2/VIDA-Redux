import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  price: number | string;
  description: string;
  features: string[];
  popular?: boolean;
  interval?: "month" | "year";
  onSubscribe?: () => void;
  buttonText?: string;
  isCurrentPlan?: boolean;
}

export function PricingCard({
  className,
  title,
  price,
  description,
  features,
  popular,
  interval = "month",
  onSubscribe,
  buttonText = "Choose Plan",
  isCurrentPlan = false,
  ...props
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl overflow-hidden",
        popular
          ? "border-2 border-primary relative"
          : "border border-surface-light/30",
        className
      )}
      {...props}
    >
      {popular && (
        <div className="absolute top-0 right-0 left-0 bg-primary text-white text-center text-sm py-1">
          MOST POPULAR
        </div>
      )}
      <div className={`p-6 ${popular ? "pt-10" : ""}`}>
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="mt-4 flex items-end">
          <span className="text-4xl font-bold">${price}</span>
          <span className="text-gray-400 ml-2">/{interval}</span>
        </div>
        <p className="mt-4 text-sm text-gray-300">{description}</p>
        <Button
          onClick={onSubscribe}
          className={`mt-6 w-full ${
            isCurrentPlan
              ? "bg-green-600 hover:bg-green-700"
              : popular
              ? "bg-primary text-white shadow-neon-purple hover:bg-primary-dark"
              : "border border-primary/50 text-primary bg-transparent hover:bg-primary/10"
          }`}
        >
          {isCurrentPlan ? "Current Plan" : buttonText}
        </Button>
      </div>
      <div className="px-6 pb-6">
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start">
              <i className="ri-check-line text-primary mt-1 mr-3"></i>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
