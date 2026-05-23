"use client";

import { createTransaction, updateTransaction } from '@/actions/transaction';
import { transactionSchema } from '@/app/lib/schema';
import CreateAccountDrawer from '@/components/create-account-drawer';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import useFecth from '@/hooks/use-fetch';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, Trash2, Wallet, Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import ReceiptScanner from './receipt-scanner';

const AddTransactionForm = ({ accounts, categories, goals = [], editMode = false, initialData = null, }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    // State for multi-goal savings allocation
    const [allocations, setAllocations] = useState(
      initialData?.allocations || []
    );

    const {
      register,
      setValue,
      handleSubmit,
      formState: { errors },
      watch,
      getValues,
      reset,
      clearErrors,
    } = useForm({
      resolver:zodResolver(transactionSchema),
      defaultValues: 
        editMode && initialData
        ? {
          type: initialData.type,
          amount: initialData.amount.toString(),
          description: initialData.description,
          accountId: initialData.accountId,
          category: initialData.category,
          date: new Date(initialData.date),
          isRecurring: initialData.isRecurring,
          ...(initialData.recurringInterval && {
            recurringInterval: initialData.recurringInterval,
          }),
          goalId: initialData.goalId || null, 
        }
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,
            date: new Date(),
            isRecurring: false,
            goalId: null,
          },
    });

    const accountId = watch("accountId");
    const type = watch("type");
    const isRecurring = watch("isRecurring")
    const date = watch("date");
    const amount = watch("amount");

    const {
      loading: transactionLoading,
      fn: transactionFn,
      data: transactionResult,
    } = useFecth(editMode ? updateTransaction : createTransaction);

    // Filter goals based on selected account
    const filteredGoals = useMemo(() => {
      if (!accountId) return [];
      return goals.filter((goal) => String(goal.accountId) === String(accountId));
    }, [accountId, goals]);

    // Finance Analyst Logic: Real-time calculation of remaining funds
    const totals = useMemo(() => {
      const baseAmount = parseFloat(amount) || 0;
      const allocatedSum = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      return {
        baseAmount,
        allocatedSum,
        remaining: baseAmount - allocatedSum
      };
    }, [amount, allocations]);

    const addAllocation = () => {
      if (totals.remaining <= 0) {
        toast.error("No remaining income to allocate");
        return;
      }
      setAllocations([...allocations, { goalId: "", amount: 0 }]);
    };

    const removeAllocation = (index) => {
      const newAllocations = [...allocations];
      newAllocations.splice(index, 1);
      setAllocations(newAllocations);
    };

    const updateAllocation = (index, field, value) => {
      const newAllocations = [...allocations];
      if (field === 'amount') {
        const val = parseFloat(value) || 0;
        const otherAllocated = allocations.reduce((sum, a, i) => i !== index ? sum + (parseFloat(a.amount) || 0) : sum, 0);
        
        // Strict Guard: Funded value cannot be greater than income transaction value
        if (val + otherAllocated > totals.baseAmount) {
          newAllocations[index][field] = Math.max(0, totals.baseAmount - otherAllocated);
          toast.warning("Allocation capped at total income amount");
        } else {
          newAllocations[index][field] = val;
        }
      } else {
        newAllocations[index][field] = value;
      }
      setAllocations(newAllocations);
    };

    const onSubmit = async (data) => {
      const formData = {
      ...data,
      amount: parseFloat(data.amount),
      goalId: data.goalId || null,
      allocations: type === "INCOME"
        ? allocations.filter((a) => a.goalId && parseFloat(a.amount) > 0)  // ← filter here
        : [],
    };
      if (editMode) {
        transactionFn(editId, formData);
      } else {
      transactionFn(formData);}
    };

    useEffect(() => {
      if (transactionResult?.success && !transactionLoading) {
        toast.success(editMode
          ? 'Transaction updated successfully' 
          : 'Transaction saved successfully');
        reset();
        setAllocations([]);
        router.push(`/account/${transactionResult.data.accountId}`);
      }
    }, [transactionResult, transactionLoading, editMode, reset, router]);

    useEffect(() => {
      if (editMode && initialData?.allocations?.length > 0) {
        setAllocations(
          initialData.allocations.map((a) => ({
            goalId: a.goalId,
            amount: parseFloat(a.amount),
          }))
        );
      }
    }, [editMode]); // runs once on mount

    const filteredCategories = categories.filter(
      (category) => category.type === type
    );

  const handleScanComplete = (scannedData) => {
  if (scannedData) {
    // 1. Update basic fields
    setValue("amount", scannedData.amount.toString());
    if (scannedData.description) setValue("description", scannedData.description);

    // 2. Handle Type and Category Logic
    if (scannedData.category) {
      const matchedCategory = categories.find(
        (cat) =>
          cat.id.toLowerCase() === scannedData.category.toLowerCase() ||
          cat.name.toLowerCase() === scannedData.category.toLowerCase()
      );

      if (matchedCategory) {
        // CRITICAL: We update the TYPE first. 
        setValue("type", matchedCategory.type);
        
        setTimeout(() => {
          setValue("category", matchedCategory.id);
        }, 0);
      }
    } else if (scannedData.type) {
      setValue("type", scannedData.type);
    }
  }
};


 return (
    <form className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
      {/* AI Recipt Scanner*/}
      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Type</label>
          <Select 
            onValueChange={(value) => {
              setValue("type", value);
              if (value !== "INCOME") setAllocations([]);
            }}
            value={type}
          >
          <SelectTrigger>
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>

        {errors.type && (
          <p className='text-sm text-red-500'>{errors.type.message}</p>
        )}
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Amount</label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
               {...register("amount", { valueAsNumber: false })}
              />

              {errors.amount && (
                <p className='text-sm text-red-500'>{errors.amount.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Account</label>
              <Select 
                onValueChange={(value) => setValue("accountId", value)}
                defaultValue={getValues("accountId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                
                <SelectContent>
                 {accounts.map((account) => (
                 <SelectItem key={account.id} value={account.id}>
                  {account.name} (₱{parseFloat(account.balance).toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                </SelectItem>

                 ))}

                 <CreateAccountDrawer redirectTo="/transaction/create"
                 onSuccess={(newAccount) => {
                    clearErrors(); 
                    setValue("accountId", newAccount.id);
                  }}
                 >
                    <Button variant='ghost' 
                    className='w-full select-none items-center text-sm outline-none'
                    >
                      Create Account
                    </Button>
                 </CreateAccountDrawer>

                </SelectContent>
              </Select>

              {errors.accountId && (
                <p className='text-sm text-red-500'>{errors.accountId.message}</p>
              )}
            </div>
      </div>

      <div className='space-y-2'>
          <label className='text-sm font-medium'>Category</label>
          <Select 
            onValueChange={(value) => setValue("category", value)}
            value={watch("category") ?? ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            
            <SelectContent>
              {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
              ))}

            </SelectContent>
          </Select>

          {errors.category?.message && (
            <p className='text-sm text-red-500'>{errors.category.message}</p>
          )}
        </div>        

      <div className='space-y-2'>
          <label className='text-sm font-medium'>Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='outline'
                  className='w-full pl-3 text-left font-normal'
                > 
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className='ml-auto h-4 w-4 opacity-50'/>
                </Button>
                 
              </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={date}
                    onSelect={(date) => setValue('date', date)}
                    disabled={(date) => 
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
            </Popover>

          {errors.date && (
            <p className='text-sm text-red-500'>{errors.date.message}</p>
          )}
        </div>        

        <div className='space-y-2'>
            <label className='text-sm font-medium'>Description</label>
            <Input placeholder='Enter description' {...register('description')}/>
            {errors.description && (
              <p className='text-sm text-red-500'>{errors.description.message}</p>
            )}
        </div>
          
        
        <div className='flex items-center justify-between rounded-lg border p-3'>
            <div className='space-y-0.5'>
              <label htmlFor="isDefault" className='text-sm font-medium cursor-pointer'>Recurring Transaction</label>
              <p className='text-sm text-muted-foreground'>Set up a recurring schedule for this transaction</p>
            </div>
            <Switch 
              checked={isRecurring}
              onCheckedChange={(checked) => setValue('isRecurring', checked)}
            />
        </div>

        {isRecurring && 
        (  
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Recurring Interval</label>
            <Select 
              onValueChange={(value) => setValue("recurringInterval", value)}
              defaultValue={getValues("recurringInterval")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Interval" />
              </SelectTrigger>
              
              <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>

              </SelectContent>
            </Select>

            {errors.recurringInterval && (
              <p className='text-sm text-red-500'>{errors.recurringInterval.message}</p>
            )}
          </div>  
        )}

        {/* Savings Allocation Engine - Finance Focused UI */}
        {type === "INCOME" && (
          <div className='space-y-4 rounded-xl border-2 border-primary/20 p-5 bg-primary/[0.02] shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='p-2 bg-primary/10 rounded-lg'>
                  <Wallet className='h-5 w-5 text-primary' />
                </div>
                <div>
                  <h3 className='font-bold text-primary leading-none'>Savings Allocation</h3>
                  <p className='text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider'>Distribution Profile</p>
                </div>
              </div>
              <div className='text-right bg-white px-3 py-1.5 rounded-lg border shadow-sm'>
                <p className='text-[10px] text-muted-foreground uppercase font-bold tracking-tight'>Unallocated Fund</p>
                <p className={`text-sm font-mono font-bold ${totals.remaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  ₱{totals.remaining.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {filteredGoals.length === 0 ? (
               <div className='flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800'>
                <Info className='h-5 w-5 mt-0.5 flex-shrink-0' />
                <p className="text-xs font-medium">
                  No active savings goals found for this account. Create goals to enable allocation streams.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {allocations.map((allocation, index) => (
                  <div key={index} className='flex gap-2 items-end animate-in fade-in zoom-in-95 duration-200'>
                    <div className='flex-1 space-y-1'>
                      <label className='text-[10px] uppercase font-bold text-muted-foreground ml-1'>Target Goal</label>
                      <Select 
                        value={allocation.goalId} 
                        onValueChange={(val) => updateAllocation(index, 'goalId', val)}
                      >
                        <SelectTrigger className='h-10'>
                          <SelectValue placeholder="Choose Goal" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredGoals.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='w-36 space-y-1'>
                      <label className='text-[10px] uppercase font-bold text-muted-foreground ml-1'>Fund Amount</label>
                      <div className='relative'>
                        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold'>₱</span>
                        <Input 
                          type="number" 
                          className='h-10 pl-7 font-mono'
                          value={allocation.amount}
                          onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className='h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors'
                      onClick={() => removeAllocation(index)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className='w-full border-dashed py-6 group hover:bg-primary/[0.03] transition-all'
                  onClick={addAllocation}
                  disabled={totals.remaining <= 0}
                >
                  <div className='flex items-center justify-center gap-2'>
                    <div className='p-1 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors'>
                      <Plus className='h-4 w-4 text-primary' />
                    </div>
                    <span className='font-semibold text-primary/80 group-hover:text-primary'>Add New Allocation Stream</span>
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}

        <div className='flex gap-4 pt-4'>
          <Button
             type='button'
            variant='outline'
            className='w-full font-semibold'
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="w-full font-bold shadow-lg shadow-primary/20" 
            disabled={transactionLoading || (type === "INCOME" && totals.remaining < 0)}
          >
          {transactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Processing..." : "Finalizing..."}
            </>
          ) : editMode? ( 
            "Update Financial Record"
          ): (
            "Post Transaction"
          )}
        </Button>
        </div>
    </form>
  )
};

export default AddTransactionForm;