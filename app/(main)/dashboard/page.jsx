import { getDashboardData, getUserAccounts } from '@/actions/dashboard';
import CreateAccountDrawer from '@/components/create-account-drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import React, { Suspense } from 'react';
import AccountCard from './_components/account-card';
import { getCurrentBudget } from '@/actions/budget';
import BudgetProgress from './_components/budget-progress';
import DashboardOverview from './_components/transaction-overview';
import GoalProgress from './_components/goal-progress';
import { getUserGoals } from '@/actions/goal';
import DailyTips from './_components/daily-tips';
import DashboardWrapper from './page-wrapper';
async function DashboardPage () {

 
  const accounts = await getUserAccounts();
    let goalData = null; 
    let budgetData = null;
    const defaultAccount = accounts?.find(a => a.isDefault) || null;

 
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
    goalData = await getUserGoals(defaultAccount.id);
  }


  const transactions = await getDashboardData();

  return (
   <DashboardWrapper>
     <div className='space-y-8'>
      {/* Daily Tips: spendsense + cha-ching Main Floating Button + Popup */}
      <DailyTips />


    {/* Budget & Goal Progress */}
    {defaultAccount && (
      <BudgetProgress
        initialBudget = {budgetData.budget}
        currentExpenses = {budgetData?.currentExpenses || 0}
      />
     
    )}
    {/* Multiple Goal Progress */}
    {defaultAccount && (
      <div className="space-y-4">
        {!goalData || goalData.length === 0 ? (
          <GoalProgress accounts={accounts} goals={[]} />
        ) : (
          <GoalProgress accounts={accounts} goals={goalData} />
        )}
      </div>
    )}



    
    {/* Overview */}
    <Suspense fallback={"Loading Overview..."}>
      <DashboardOverview
        accounts={accounts}
        transactions={transactions || []}
      />
    </Suspense>

    {/* Accounts Grid */}
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      <CreateAccountDrawer>
        <Card className='hover:shadow-md transition-shadow cursor-pointer border-dashed'>
          <CardContent className='flex flex-col items-center justify-center text-muted-foreground h-full pt-5'>
            <Plus className="h-10 w-10 mb-2" />
            <p className='text-sm font-medium'>Add New Account</p>
          </CardContent>
        </Card>
      </CreateAccountDrawer>

      {accounts.length > 0 &&
       accounts?.map((account) =>{
        return <AccountCard key={account.id} account={account} />;
       })}
    </div>
  </div>
       </DashboardWrapper>
  );
}

export default DashboardPage;