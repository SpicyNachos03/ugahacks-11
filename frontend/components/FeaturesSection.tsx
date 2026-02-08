import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Code, 
  Users, 
  Smartphone,
  GitBranch, 
  Shield,
  BarChart3
} from "lucide-react";

const features = [
  {
    icon: Code,
    title: "Predictive Cooling Model",
    description: "Uses Gradient Boosting and Regression to forecast cooling needs based on historical and real-time usage data.",
    badge: "Core"
  },
  {
    icon: Code,
    title: "Optimization Policy Generator",
    description: "Implements Imitation Learning and Reinforcement strategies to optimize device workload distribution and cooling efficiency.",
    badge: "Core"
  },
  {
    icon: Users,
    title: "Gemini Analytics API",
    description: "Analyzes cost, energy, and carbon impact when offloading workloads to idle devices and edge locations.",
    badge: "Pro"
  },
  {
    icon: Smartphone,
    title: "Federated Learning Engine",
    description: "Trains models across multiple devices without centralizing data, protecting privacy while improving predictions.",
    badge: "AI"
  },
  {
    icon: GitBranch,
    title: "Maps & Traffic Integration",
    description: "Visualizes population density and traffic signals to identify optimal edge locations for offloaded workloads.",
    badge: "Enterprise"
  },
  {
    icon: Shield,
    title: "Community Impact",
    description: "Involves the community in helping the environment by offloading workloads to idle devices",
    badge: "Enterprise"
  },
  {
    icon: Smartphone,
    title: "Environmental Impact",
    description: "Ability to lessen the amount of carbon emissions, energy consumption, and water usage from traditional data centers",
    badge: "Core"
  },
  {
    icon: BarChart3,
    title: "Dashboard & Analytics",
    description: "Monitor system usage, workload adoption, cost savings, and carbon footprint in a unified dashboard.",
    badge: "Pro"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4 text-gray-900">
            Features to maintain and optimize your data center
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-700">
            From building predictive models to comprehensive dashboards, our platform provides all the insights you need to maintain scalable cooling systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="relative border bg-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-8 w-8 text-primary" />
                    <Badge variant="default" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-700">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
