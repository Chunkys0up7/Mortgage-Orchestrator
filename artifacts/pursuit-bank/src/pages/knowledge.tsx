import { useListKnowledgeArticles } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Book, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const { data: articles, isLoading } = useListKnowledgeArticles(search ? { search } : undefined);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-2">
          <Book className="w-6 h-6" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground text-lg">Search guidelines, policies, and procedural documentation.</p>
        
        <div className="relative mt-4 max-w-xl mx-auto w-full shadow-sm rounded-lg">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search 'FHA down payment' or 'Appraisal requirements'..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 text-lg bg-card border-muted-foreground/20 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : articles?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No articles found matching "{search}".
          </div>
        ) : (
          articles?.map((article) => (
            <Card key={article.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{article.category}</Badge>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{article.source}</span>
                    </div>
                    <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{article.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{article.summary}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {article.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs text-muted-foreground border-dashed bg-muted/10">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
