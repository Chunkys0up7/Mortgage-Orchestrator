import { useGetRates, useGetRateHistory } from "@workspace/api-client-react";
import { formatPercentage } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function RatesSheet() {
  const { data: rates, isLoading: isLoadingRates } = useGetRates();
  const { data: history, isLoading: isLoadingHistory } = useGetRateHistory();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Rate Sheet</h1>
        <p className="text-muted-foreground">Current mortgage rates and historical trends.</p>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle>30-Day Rate Trend</CardTitle>
          <CardDescription>Primary conventional and ARM products</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-2 pl-0 pr-6 h-[350px]">
          {isLoadingHistory ? (
            <Skeleton className="w-full h-full rounded-none" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <RechartsTooltip 
                  formatter={(value: number) => [`${value}%`, '']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                <Line type="monotone" name="30 Yr Fixed" dataKey="rate30yr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" name="15 Yr Fixed" dataKey="rate15yr" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" name="5/1 ARM" dataKey="rateArm5" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Rates</CardTitle>
          <CardDescription>Last updated today at 8:00 AM EST</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Product</TableHead>
                <TableHead>Term (Years)</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRates ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : (
                rates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="pl-6 font-medium capitalize">
                      {rate.productType.replace('_', ' ')}
                      {rate.productType === 'conventional' && rate.term === 30 && (
                        <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">Benchmark</Badge>
                      )}
                    </TableCell>
                    <TableCell>{rate.term}</TableCell>
                    <TableCell className="font-bold text-lg">{formatPercentage(rate.rate)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPercentage(rate.apr)}</TableCell>
                    <TableCell>{rate.points > 0 ? rate.points : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
