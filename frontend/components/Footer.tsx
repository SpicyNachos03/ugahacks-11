import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary"></div>
              <span className="font-semibold" >Supa Idle</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              The complete platform for maintaining and optimizing data centers
              that help teams analyze environmental impacts.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                placeholder="Enter your email" 
                className="max-w-xs"
              />
              <Button>Subscribe</Button>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a 
                  href="#features" 
                  className="hover:text-foreground transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a 
                  href="#pricing" 
                  className="hover:text-foreground transition-colors"
                >
                  Impacts
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Team</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-foreground transition-colors">Khoa</a></li>
              <li><a href="#careers" className="hover:text-foreground transition-colors">Lauren</a></li>
              <li><a href="#contact" className="hover:text-foreground transition-colors">Daniel</a></li>
              <li><a href="#support" className="hover:text-foreground transition-colors">Tiffany</a></li>
            </ul>
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © 2026 Supa Idle. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <a href="#privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#cookies" className="hover:text-foreground transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
