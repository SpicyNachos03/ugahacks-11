import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check, Wallet, Leaf, Droplets } from "lucide-react";

const impacts = [
  {
    name: "Cost Savings",
    icon: Wallet,
    description: "Reduce operational costs by utilizing idle devices instead of running all workloads in traditional data centers.",
    metrics: [
      "Up to 40% reduction in data center costs",
      "Lower hardware investment",
      "Reduced need for cooling infrastructure"
    ],
    badge: "Financial",
    popular: true // This will trigger the floating Badge
  },
  {
    name: "Carbon Reduction",
    icon: Leaf,
    description: "Offloading workloads to idle devices decreases the overall carbon footprint of computing operations.",
    metrics: [
      "Up to 35% less CO₂ emissions",
      "More efficient use of renewable energy",
      "Less reliance on fossil-fuel servers"
    ],
    badge: "Eco",
    popular: false
  },
  {
    name: "Resource Efficiency",
    icon: Droplets,
    description: "Reduce energy consumption and water usage by leveraging idle devices instead of cooling-intensive centers.",
    metrics: [
      "30% less energy consumption",
      "Significant reduction in cooling water",
      "Sustainable computing practices"
    ],
    badge: "Resource",
    popular: false
  }
];

export function ImpactSection() {
  return (
    <section id="impact" className="pb-20 lg:py-32 bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
            Impact
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4 text-emerald-950">
            Measurable effects of{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              offloading workloads
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            Leveraging idle devices instead of traditional data centers can significantly reduce costs, carbon emissions, and water usage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {impacts.map((impact, index) => {
            const Icon = impact.icon;
            return (
              <Card 
                key={index} 
                className={`relative border-emerald-50 bg-white transition-all ${
                  impact.popular ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500/50' : 'shadow-sm hover:border-emerald-200'
                }`}
              >
                {/* The "Most Popular" style tag applied to the Impact Section */}
                {impact.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md">
                    Most Impactful
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-8 w-8 text-emerald-600" />
                    <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-100">
                      {impact.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-emerald-900">{impact.name}</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="text-muted-foreground mb-6">
                    {impact.description}
                  </CardDescription>
                  
                  <ul className="space-y-3">
                    {impact.metrics.map((metric, metricIndex) => (
                      <li key={metricIndex} className="flex items-center">
                        <Check className="h-4 w-4 text-emerald-500 mr-3 flex-shrink-0" />
                        <span className="text-sm text-emerald-900/80">{metric}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}