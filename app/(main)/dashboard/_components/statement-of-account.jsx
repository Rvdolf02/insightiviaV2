"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { getStatementData } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Image from "next/image";
import { Card } from "@/components/ui/card";

export default function StatementPage({
  controlledOpen,
  onOpenChange,
}) {
  const [data, setData] = useState(null);
  const pdfRef = useRef();

  // Helper to format date as YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

const getDefaultDates = () => {
  const now = new Date();
  
  // First day of the current month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Last day of the current month
  // (Setting day to 0 of the next month gives the last day of the current month)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay)
  };
};
 
  const { start, end } = getDefaultDates();
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);


  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // PDF specific state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfCurrentRows, setPdfCurrentRows] = useState([]);

  const paginatedTransactions = data?.transactions?.slice(
    (page - 1) * pageSize,
    page * pageSize
  ) || [];

  useEffect(() => {
    if (!controlledOpen) return;
    async function load() {
      try {
        setPage(1);
        const res = await getStatementData(null, startDate, endDate);
        setData(res);
      } catch (err) {
        console.error("SOA ERROR:", err);
      }
    }
    load();
  }, [controlledOpen, startDate, endDate]);

  if (!controlledOpen) return null;

  const format = (num) =>
    `₱${Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    const pdf = new jsPDF("p", "mm", "a4");
    const totalTransactions = data?.transactions || [];
    
    // Define how many rows fit on a page safely with the header
    const rowsPerPage = 20; 
    const totalPages = Math.ceil(totalTransactions.length / rowsPerPage) || 1;

    for (let i = 0; i < totalPages; i++) {
      // 1. Set the subset of rows for this specific PDF page
      const start = i * rowsPerPage;
      const end = start + rowsPerPage;
      setPdfCurrentRows(totalTransactions.slice(start, end));

      // 2. Wait for React to render the DOM for this specific page
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) pdf.addPage();
      
      // 3. Add the captured "page" image
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // 4. Add Footer/Page Numbers manually
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Page ${i + 1} of ${totalPages} • Insightivia Statement`,
        105,
        290,
        { align: "center" }
      );
    }

    pdf.save(`Statement_${startDate}_to_${endDate}.pdf`);
    setIsGeneratingPDF(false);
    setPdfCurrentRows([]); // Reset
  };

  const renderModal = (content) =>
    typeof document !== "undefined"
      ? createPortal(content, document.body)
      : null;

  // Determine which transactions to show (UI vs PDF generation)
  const displayTransactions = isGeneratingPDF ? pdfCurrentRows : paginatedTransactions;

  return renderModal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <Card
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {!data ? (
          <p className="text-center py-10">Loading statement...</p>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={downloadPDF} disabled={isGeneratingPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  {isGeneratingPDF ? "Generating..." : "Download"}
                </Button>
              </div>
            </div>

            {/* THIS IS THE AREA CAPTURED BY PDF */}
            <div
              ref={pdfRef}
              className="bg-white p-6 rounded-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <Image src="/logo-3.png" alt="watermark" width={400} height={400} />
              </div>

              {/* HEADER - This will now repeat on every page because we capture page by page */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b pb-4 mb-6 gap-4">
                <div className="flex items-start md:items-center gap-3">
                  <Image src="/logo-3.png" alt="logo" width={100} height={40} />
                  <div>
                    <h1 className="font-bold text-lg md:text-xl">Statement of Account</h1>
                    <p className="text-xs text-gray-500">Insightivia Financial Report</p>
                    <p className="text-xs text-gray-500">
                      Account: {data.account.name} ({data.account.type}) • ****{data.account.id.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500">Period: {startDate} → {endDate}</p>
                    <p className="text-xs text-gray-500">Statement ID: SOA-{startDate.replaceAll("-", "")}</p>
                  </div>
                </div>
                <div className="text-left md:text-right text-sm">
                  <p className="font-semibold">{data.user.name}</p>
                  <p className="text-gray-500">{data.user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <Box label="Beginning" value={format(data.summary.beginningBalance)} />
                <Box label="Total In" value={format(data.summary.totalIn)} green />
                <Box label="Total Out" value={format(data.summary.totalOut)} red />
                <Box label="Ending" value={format(data.summary.endingBalance)} gray />
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs md:text-sm min-w-[700px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Ref</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Category</th>
                      <th className="p-2 text-left">Allocations</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-6 text-gray-500">No transactions</td>
                      </tr>
                    ) : (
                      displayTransactions.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="p-2 font-mono text-xs">{t.id.slice(0, 8).toUpperCase()}</td>
                          <td className="p-2">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="p-2">{t.description || "-"}</td>
                          <td className="p-2">{t.category}</td>
                          <td className="p-2">
                            {t.allocations?.map((a) => (
                              <div key={a.id}>{a.goal.title} — {format(a.amount)}</div>
                            )) || "-"}
                          </td>
                          <td className={`p-2 text-right ${t.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                            {format(t.amount)}
                          </td>
                          <td className="p-2 text-right">{format(t.runningBalance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION (Hidden during PDF generation) */}
              {!isGeneratingPDF && (
                <div className="flex justify-between items-center mt-4 text-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>Page {page}</span>
                  <button
                    disabled={page * pageSize >= data.transactions.length}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
              
              <div className="mt-6 text-xs text-center text-gray-500 border-t pt-4">
                System-generated statement • No signature required
              </div>
            </div>

            <div className="mt-4 text-right">
              <button onClick={() => onOpenChange(false)} className="px-4 py-2 border rounded-md">
                Close
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

const Box = ({ label, value, green, red, gray }) => (
  <div className={`p-4 rounded-lg border shadow-sm bg-white ${gray ? "bg-gray-50" : ""}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-sm md:text-base font-semibold mt-1 ${green ? "text-green-700" : red ? "text-red-700" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);