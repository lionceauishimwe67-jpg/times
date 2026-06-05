import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListClasses, useCreateClass, useUpdateClass, useDeleteClass,
  getListClassesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassForm { name: string; trade: string; level: number }
const emptyForm: ClassForm = { name: "", trade: "", level: 5 };

export default function ManageClasses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);

  const { data: classes = [], isLoading } = useListClasses();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });

  const createMutation = useCreateClass({
    mutation: {
      onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Class created" }); },
      onError: () => toast({ title: "Failed to create class", variant: "destructive" }),
    },
  });
  const updateMutation = useUpdateClass({
    mutation: {
      onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Class updated" }); },
      onError: () => toast({ title: "Failed to update class", variant: "destructive" }),
    },
  });
  const deleteMutation = useDeleteClass({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Class deleted" }); },
      onError: () => toast({ title: "Failed to delete class", variant: "destructive" }),
    },
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (cls: any) => { setEditId(cls.id); setForm({ name: cls.name, trade: cls.trade, level: cls.level }); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate({ data: form });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classes</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage all school classes by trade and level</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Class
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : classes.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No classes yet. Add one to get started.</TableCell></TableRow>
            ) : classes.map((cls: any) => (
              <TableRow key={cls.id}>
                <TableCell className="font-medium">{cls.name}</TableCell>
                <TableCell>{cls.trade}</TableCell>
                <TableCell><Badge variant="outline">L{cls.level}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cls)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: cls.id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Class" : "Add New Class"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. L5 Fashion Design" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade">Trade</Label>
              <Input id="trade" value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} placeholder="e.g. Fashion" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input id="level" type="number" min={1} max={7} value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 5 }))} required />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? "Update Class" : "Create Class"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
