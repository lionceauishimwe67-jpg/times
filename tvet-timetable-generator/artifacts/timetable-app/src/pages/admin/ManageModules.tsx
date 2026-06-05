import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListModules, useCreateModule, useUpdateModule, useDeleteModule,
  getListModulesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModuleForm { code: string; name: string; weeklyPeriods: number; isSpecific: boolean; trade: string }
const emptyForm: ModuleForm = { code: "", name: "", weeklyPeriods: 2, isSpecific: false, trade: "" };

export default function ManageModules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ModuleForm>(emptyForm);

  const { data: modules = [], isLoading } = useListModules();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });

  const createMutation = useCreateModule({ mutation: { onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Module created" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const updateMutation = useUpdateModule({ mutation: { onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Module updated" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const deleteMutation = useDeleteModule({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Module deleted" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (m: any) => { setEditId(m.id); setForm({ code: m.code, name: m.name, weeklyPeriods: m.weeklyPeriods, isSpecific: m.isSpecific, trade: m.trade }); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) updateMutation.mutate({ id: editId, data: form });
    else createMutation.mutate({ data: form });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Modules</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage training modules and their weekly periods</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Module</Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Periods/Week</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Assigned Teacher</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : modules.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No modules yet.</TableCell></TableRow>
            ) : (modules as any[]).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">{m.code}</TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.trade}</TableCell>
                <TableCell className="text-center">{m.weeklyPeriods}</TableCell>
                <TableCell>
                  <Badge variant={m.isSpecific ? "default" : "secondary"}>
                    {m.isSpecific ? "Specific" : "General"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {m.teacherCode ? (
                    <span className="text-sm">{m.teacherName} <span className="text-muted-foreground">({m.teacherCode})</span></span>
                  ) : (
                    <span className="text-muted-foreground text-sm italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: m.id })}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Module" : "Add New Module"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Module Code</Label>
                <Input id="code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. FADWW501" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trade">Trade</Label>
                <Input id="trade" value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} placeholder="e.g. Fashion" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Module Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Women's wear" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periods">Weekly Periods</Label>
              <Input id="periods" type="number" min={1} max={20} value={form.weeklyPeriods} onChange={e => setForm(f => ({ ...f, weeklyPeriods: parseInt(e.target.value) || 2 }))} required />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="specific" checked={form.isSpecific} onCheckedChange={(checked: boolean) => setForm(f => ({ ...f, isSpecific: Boolean(checked) }))} />
              <Label htmlFor="specific" className="cursor-pointer">Specific module (schedule in blocks of 2-3 periods)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? "Update Module" : "Create Module"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
