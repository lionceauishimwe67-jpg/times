import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher,
  getListTeachersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeacherForm { name: string; code: string; moduleCodes: string }
const emptyForm: TeacherForm = { name: "", code: "", moduleCodes: "" };

export default function ManageTeachers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);

  const { data: teachers = [], isLoading } = useListTeachers();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() });

  const createMutation = useCreateTeacher({ mutation: { onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Teacher created" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const updateMutation = useUpdateTeacher({ mutation: { onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Teacher updated" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const deleteMutation = useDeleteTeacher({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Teacher deleted" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: any) => { setEditId(t.id); setForm({ name: t.name, code: t.code, moduleCodes: t.moduleCodes.join(", ") }); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      code: form.code,
      moduleCodes: form.moduleCodes.split(",").map(c => c.trim()).filter(Boolean),
    };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else createMutation.mutate({ data: payload });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teachers</h2>
          <p className="text-muted-foreground text-sm mt-1">Assign teachers to modules for conflict-free scheduling</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Teacher</Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Assigned Modules</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (teachers as any[]).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No teachers yet.</TableCell></TableRow>
            ) : (teachers as any[]).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono font-bold text-primary">{t.code}</TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(t.moduleCodes || []).map((code: string) => (
                      <Badge key={code} variant="secondary" className="font-mono text-xs">{code}</Badge>
                    ))}
                    {(!t.moduleCodes || t.moduleCodes.length === 0) && (
                      <span className="text-muted-foreground text-sm italic">None assigned</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: t.id })}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Teacher" : "Add Teacher"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tname">Full Name</Label>
                <Input id="tname" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ms. Uwera" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tcode">Code</Label>
                <Input id="tcode" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. T01" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modules">Module Codes (comma-separated)</Label>
              <Input id="modules" value={form.moduleCodes} onChange={e => setForm(f => ({ ...f, moduleCodes: e.target.value }))} placeholder="e.g. FADWW501, FADEG501" />
              <p className="text-xs text-muted-foreground">Separate multiple module codes with commas</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? "Update Teacher" : "Create Teacher"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
