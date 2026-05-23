"use client";

import React, { useEffect, useState } from 'react';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountSchema } from '@/app/lib/schema';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import useFecth from '@/hooks/use-fetch';
import { createAccount, updateAccount } from '@/actions/dashboard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const CreateAccountDrawer = ({ children, mode, account, onSuccess, openFromQuery = false, redirectTo = "/dashboard" }) => {
  const [open, setOpen] = useState(openFromQuery);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "CURRENT",
      balance: "",
      isDefault: false,
    },
  });

  // choose appropriate server action
  const { data, error, fn, loading } = useFecth(mode === "edit" ? updateAccount : createAccount);

  // prefill when editing
  useEffect(() => {
    if (mode === "edit" && account) {
      reset({
        name: account.name ?? "",
        type: account.type ?? "CURRENT",
        balance: account.balance?.toString() ?? "",
        isDefault: !!account.isDefault,
      });
    }
  }, [mode, account, reset]);

  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (data && !loading && !handled) {
      toast.success(mode === "edit" ? "Account updated successfully" : "Account created successfully");
      reset();
      setOpen(false);
      if (onSuccess) onSuccess(data);

    // Clean the URL: remove ?openCreateAccount=true
      router.replace(redirectTo);
      setHandled(true); // prevent loop
      router.refresh();
    }
  }, [data, loading, mode, reset, onSuccess, router, handled, redirectTo]);

  // Reset the flag when making a new request
  const onSubmit = async (values) => {
    setHandled(false); // reset before new request
    const payload = {
      ...values,
      balance: values.balance === "" ? "0" : values.balance,
    };

    if (mode === "edit") {
      await fn({ id: account.id, ...payload });
    } else {
      await fn(payload);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {/* children or fallback button */}
        {children || <div />}
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{mode === "edit" ? "Edit Account" : "Create New Account"}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name</label>
              <Input {...register("name")} placeholder="eg., Main Checking" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type</label>
              <Select onValueChange={(val) => setValue("type", val)} defaultValue={watch("type")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT">Current</SelectItem>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Balance</label>
              <Input {...register("balance")} type="number" step="0.01" placeholder="0.00" />
              {errors.balance && <p className="text-sm text-red-500">{errors.balance.message}</p>}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <label className="text-sm font-medium cursor-pointer">Set as Default</label>
                <p className="text-sm text-muted-foreground">This account will be selected by default for transactions</p>
              </div>
              <Switch onCheckedChange={(checked) => setValue("isDefault", checked)} checked={watch("isDefault")} />
            </div>

            <div className="flex gap-4 pt-4">
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="outline" 
                  className="flex-1"  
                  onClick={() => router.replace(redirectTo)}
                >
                  Cancel
                </Button>
              </DrawerClose>

              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "edit" ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  mode === "edit" ? "Update Account" : "Create Account"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CreateAccountDrawer;