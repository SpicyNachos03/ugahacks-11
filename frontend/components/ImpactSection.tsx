import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check } from "lucide-react";

const impacts = [
  {
    name: "Cost Savings",
    description: "Reduce operational costs by utilizing idle devices instead of running all workloads in traditional data centers.",
    metrics: [
      "Up to 40% reduction in data center costs",
      "Lower hardware investment",
      "Reduced need for cooling infrastructure"
    ],
    popular: true
  },
  {
    name: "Carbon Emissions Reduction",
    description: "Offloading workloads to idle devices decreases the overall carbon footprint of computing operations.",
    metrics: [
      "Up to 35% less CO₂ emissions",
      "More efficient use of renewable energy sources",
      "Less reliance on fossil-fuel-powered servers"
    ],
    popular: false
  },
  {
    name: "Energy & Water Efficiency",
    description: "Reduce energy consumption and water usage by leveraging idle devices instead of centralized cooling-intensive data centers.",
    metrics: [
      "30% less energy consumption",
      "Significant reduction in water used for cooling",
      "More sustainable computing practices"
    ],
    popular: false
  }
];

export function ImpactSection() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4 text-gray-900">
            Impact of Offloading Workloads to Idle Devices
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-700">
            Leveraging idle devices instead of traditional data centers can significantly reduce costs, carbon emissions, energy consumption, and water usage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {impacts.map((impact, index) => (
            <Card key={index} className={`relative ${impact.popular ? 'border-primary shadow-lg' : ''} bg-white`}>
              {impact.popular && (
                <Badge
                  className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-white bg-gray-500 px-4 py-1 text-sm font-bold shadow-lg uppercase tracking-wide"
                  style={{ fontSize: '0.75rem' }}
                >
                  Most Impactful
                </Badge>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-xl mb-2 text-gray-900">{impact.name}</CardTitle>
                <CardDescription className="text-gray-700">{impact.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-8">
                  {impact.metrics.map((metric, metricIndex) => (
                    <li key={metricIndex} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-800 text-sm">{metric}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
