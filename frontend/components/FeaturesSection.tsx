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
    <section id="features" className="pb-10 lg:py-20 bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
            Features
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4 text-emerald-950">
            Features to maintain and optimize your{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              data center
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            From building predictive models to comprehensive dashboards, our platform provides all the insights you need to maintain scalable cooling systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="relative border-emerald-50 bg-white shadow-sm hover:border-emerald-200 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-8 w-8 text-emerald-600" />
                    <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-100">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-emerald-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}