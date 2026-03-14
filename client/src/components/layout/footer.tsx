import { Link } from "wouter";
import { Phone, Mail } from "lucide-react";
import logoImage from "@assets/Logo_1769488051360.png";

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img 
              src={logoImage} 
              alt="ATID Reality" 
              className="h-12 w-auto object-contain"
            />
            <p className="text-sm text-sidebar-foreground/70 max-w-xs">
              Professional property management services you can trust. Making property ownership simple and stress-free.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/api/login" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Pay Rent
                </a>
              </li>
              <li>
                <a href="/api/login" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Maintenance Request
                </a>
              </li>
              <li>
                <a href="/api/login" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  Tenant Portal
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-sidebar-foreground/50" />
                <div>
                  <a href="tel:+15551234567" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">(954) 338-3885</a>
                  <p className="text-xs text-sidebar-foreground/50">Mon-Fri 9am-5pm</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-sidebar-foreground/50" />
                <a href="mailto:info@atidreality.com" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  info@atidreality.com
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-sidebar-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-sidebar-foreground/50">
            <p>&copy; {new Date().getFullYear()} ATID Reality Real Estate. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-sidebar-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-sidebar-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
