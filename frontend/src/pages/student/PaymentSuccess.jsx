import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig'; 
import { doc, getDoc } from 'firebase/firestore';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const invoiceRef = useRef();

  const [invoiceData, setInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      setIsLoading(true);

      const queryParams = new URLSearchParams(location.search);
      const orderId = queryParams.get('order_id') || queryParams.get('order_no');

      if (location.state && location.state.paymentDetails) {
        setInvoiceData(location.state.paymentDetails);
        setIsLoading(false);
      } else if (orderId) {
        try {
          const docRef = doc(db, 'transactions', orderId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            // 💡 FIX: Backend Field Names හරියටම Map කිරීම
            const paidAmount = data.amount_paid !== undefined ? data.amount_paid : (data.amount || 0);
            const totalCredits = data.credits_added !== undefined ? data.credits_added : (data.credits || 0);
            const createdDate = data.created_at ? new Date(data.created_at).toLocaleString() : new Date().toLocaleString();

            setInvoiceData({
              transactionId: data.transaction_id || orderId,
              date: createdDate,
              package: `${data.plan_name || 'Subscription'} Package (${totalCredits} Credits)`,
              amount: `LKR ${Number(paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              method: data.payment_method || 'PayHere Gateway',
            });
          } else {
            setInvoiceData({
              transactionId: orderId,
              date: new Date().toLocaleString(),
              package: "Subscription Package",
              amount: "LKR 0.00",
              method: "PayHere Online"
            });
          }
        } catch (error) {
          console.error("Error fetching invoice from Firestore:", error);
          setInvoiceData({
            transactionId: orderId,
            date: new Date().toLocaleString(),
            package: "Subscription Package",
            amount: "LKR 0.00",
            method: "PayHere Online"
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setInvoiceData({
          transactionId: "ORD-1784626819387",
          date: new Date().toLocaleString(),
          package: "LITE Package (350 Credits)",
          amount: "LKR 3,000.00",
          method: "PayHere Online"
        });
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [location]);

  useEffect(() => {
    if (!isLoading && invoiceData) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, invoiceData]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !invoiceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-gray-600 text-sm">Fetching Payment Invoice...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 text-gray-900">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 md:p-8">
        <div className="text-center mb-8 no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="text-gray-600 mt-2">Your subscription has been updated and credits have been added.</p>
        </div>

        <div ref={invoiceRef} className="bg-white p-6 rounded-md border border-gray-200 printable-area">
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-sm text-gray-500">Transaction ID: {invoiceData.transactionId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">Exam Portal (Ltd)</p>
              <p className="text-xs text-gray-500">{invoiceData.date}</p>
            </div>
          </div>

          <table className="w-full text-left mb-6">
            <thead>
              <tr className="border-b text-gray-600 text-sm">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-gray-800 text-sm">
                <td className="py-3 font-medium">{invoiceData.package}</td>
                <td className="py-3 text-right font-semibold">{invoiceData.amount}</td>
              </tr>
            </tbody>
          </table>

          <div className="border-t pt-4 flex justify-between items-center text-sm text-gray-600">
            <div>
              <p>Payment Method: <span className="font-medium text-gray-900">{invoiceData.method}</span></p>
              <p className="text-xs text-green-600 font-semibold mt-1">Status: Paid</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-gray-900">Total Paid: {invoiceData.amount}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6 no-print">
          <button 
            onClick={handlePrint} 
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            <span>Download / Print Invoice</span>
          </button>
          
          <button 
            onClick={() => navigate('/student')} 
            className="px-4 py-2 bg-indigo-600 rounded-md text-sm font-medium text-white hover:bg-indigo-700 transition-all shadow-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;