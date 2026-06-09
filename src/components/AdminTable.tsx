import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  title: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  selectable?: boolean;
  selectedItems?: Set<string>;
  onSelectItem?: (id: string) => void;
  onSelectAll?: () => void;
  actions?: ReactNode;
}

export default function AdminTable<T extends Record<string, any>>({
  title,
  description,
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data found",
  selectable = false,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll,
  actions,
}: AdminTableProps<T>) {
  const allSelected = data.length > 0 && selectedItems.size === data.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions}
        </div>
        {selectable && selectedItems.size > 0 && (
          <div className="text-sm text-muted-foreground mt-2">
            {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onSelectAll}
                      className="h-8 w-8"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length + (selectable ? 1 : 0)} 
                    className="text-center text-muted-foreground py-8"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  const id = keyExtractor(item);
                  const isSelected = selectedItems.has(id);
                  
                  return (
                    <TableRow key={id} className={isSelected ? "bg-muted/50" : ""}>
                      {selectable && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSelectItem?.(id)}
                            className="h-8 w-8"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render ? col.render(item) : item[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
