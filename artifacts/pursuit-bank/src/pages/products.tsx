import { useListProducts } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductsList() {
  const { data: products, isLoading } = useListProducts();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground">Available mortgage products and underwriting guidelines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-[400px]">
              <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-full" /></CardHeader>
              <CardContent><Skeleton className="h-32 w-full" /></CardContent>
            </Card>
          ))
        ) : (
          products?.map((product) => (
            <Card key={product.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={product.isActive ? "default" : "secondary"} className="mb-2">
                    {product.productType.toUpperCase()}
                  </Badge>
                  {product.term && <Badge variant="outline">{product.term} Year</Badge>}
                </div>
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2">{product.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-muted/30 p-3 rounded-lg border">
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Max Loan</div>
                    <div className="font-medium">{formatCurrency(product.maxLoanAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Min FICO</div>
                    <div className="font-medium">{product.minCreditScore}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Max LTV</div>
                    <div className="font-medium">{product.maxLtv}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Max DTI</div>
                    <div className="font-medium">{product.maxDti}%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Key Features</div>
                  <ul className="space-y-1.5">
                    {product.features.slice(0, 3).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t mt-4 flex items-center justify-between p-4 bg-muted/10">
                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  See Guidelines
                </div>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary">View Details</Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
