// ========================================
// PROTECT (TenantShield) - Mock Data
// ========================================

// Sample rent agreement for the explainer
const PR_SAMPLE_AGREEMENT = `RENT AGREEMENT

This agreement is made on 15th June 2024 between:

LANDLORD: Ramesh Kumar Singh, S/o Late Baldev Singh, residing at House No. 234, Sector 15, Rajpura, Punjab - 140401

TENANT: Priya Sharma, D/o Mr. Anil Sharma, currently residing at Girls Hostel, Chitkara University, Rajpura, Punjab

PREMISES: First floor, 2BHK flat, House No. 234-A, Sector 15, Rajpura, Punjab - 140401

TERMS AND CONDITIONS:

1. RENT: The monthly rent for the premises shall be Rs. 8,000/- (Rupees Eight Thousand Only) payable on or before the 5th day of each month.

2. SECURITY DEPOSIT: The tenant shall pay a security deposit of Rs. 24,000/- (Rupees Twenty Four Thousand Only) which is 3 months rent. This deposit will be refunded at the end of tenancy after deducting any dues.

3. LOCK-IN PERIOD: This agreement has a lock-in period of 11 months. If tenant vacates before this period, the entire security deposit shall be forfeited.

4. ELECTRICITY CHARGES: Tenant shall pay electricity charges at Rs. 12 per unit as per actual consumption recorded on the sub-meter.

5. MAINTENANCE: Any damage to walls, fixtures, or fittings shall be repaired by tenant at their own cost. At the time of vacating, tenant must get the flat painted and pay Rs. 5,000 for deep cleaning.

6. RENT INCREMENT: Rent shall be increased by 12% every year.

7. NOTICE PERIOD: Tenant must give 2 months advance notice before vacating. Failure to do so will result in forfeiture of one month rent from the deposit.

8. VISITORS: No male visitors are allowed in the premises at any time. Any violation will result in immediate termination of agreement.

9. LANDLORD ACCESS: The landlord reserves the right to inspect the premises at any time without prior notice.

10. SUBLETTING: Tenant cannot sublet or allow any other person to stay in the premises without written permission from landlord.

Signed:
Landlord: ________________
Tenant: ________________
Date: 15/06/2024`;

// Sample evidence entries for "Load sample data"
const PR_SAMPLE_LOCKER = [
  {
    id: 'ev_001',
    date: '2025-07-12',
    category: 'Move-in photos',
    title: 'Flat condition on day 1',
    note: 'Photos taken during handover. Wall crack visible in bedroom, kitchen tap was loose, bathroom drain slow.',
    amount: null,
    photos: ['assets/room-1.jpg', 'assets/hero-room.jpg']
  },
  {
    id: 'ev_002',
    date: '2025-09-03',
    category: 'Maintenance complaint',
    title: 'Water supply issue - complaint to owner',
    note: 'WhatsApp message sent at 6:30 AM: "Sir, no water since yesterday evening. Please fix urgently." No response received.',
    amount: null,
    photos: []
  },
  {
    id: 'ev_003',
    date: '2025-09-09',
    category: 'Maintenance complaint',
    title: 'Follow-up on water issue',
    note: 'Called owner twice. He said "not my problem, talk to water board." Water came back after 3 days on its own.',
    amount: null,
    photos: []
  },
  {
    id: 'ev_004',
    date: '2025-10-05',
    category: 'Payment/receipt',
    title: 'October rent paid',
    note: 'Paid ₹8,000 via UPI to owner. Transaction ID: 423156789012. Receipt received on WhatsApp.',
    amount: 8000,
    photos: []
  },
  {
    id: 'ev_005',
    date: '2026-06-01',
    category: 'Move-out photos',
    title: 'Flat condition on last day',
    note: 'Flat cleaned, all fixtures intact. Same wall crack as move-in still there. Left keys with owner at 11 AM.',
    amount: null,
    photos: ['assets/room-1.jpg']
  },
  {
    id: 'ev_006',
    date: '2026-06-10',
    category: 'Deduction',
    title: 'Owner deducted ₹12,000 for "wall damage"',
    note: 'Owner says bedroom wall crack is my fault and keeping ₹12,000 from deposit. But the crack was already there on day 1 (see move-in photos).',
    amount: -12000,
    photos: []
  }
];

// Agreement analysis rules
const PR_AGREEMENT_RULES = [
  {
    keywords: ['security deposit', 'deposit', 'advance'],
    name: 'Security Deposit Amount',
    checkFn: (text) => {
      // Try to extract deposit and rent amounts
      const depositMatch = text.match(/deposit.*?Rs\.?\s*(\d+,?\d*)/i);
      const rentMatch = text.match(/rent.*?Rs\.?\s*(\d+,?\d*)/i);
      
      if (!depositMatch || !rentMatch) return null;
      
      const deposit = parseInt(depositMatch[1].replace(',', ''));
      const rent = parseInt(rentMatch[1].replace(',', ''));
      const ratio = deposit / rent;
      
      if (ratio > 2.5) {
        return {
          verdict: 'Unfair',
          meaning: `The deposit is ${ratio.toFixed(1)} months of rent. The Model Tenancy Act recommends a maximum of 2 months rent as security deposit.`
        };
      } else if (ratio > 2) {
        return {
          verdict: 'Check this',
          meaning: `The deposit is ${ratio.toFixed(1)} months of rent. This is slightly above the recommended 2 months but may be negotiable.`
        };
      } else {
        return {
          verdict: 'Fair',
          meaning: `The deposit is ${ratio.toFixed(1)} months of rent, which is within the recommended limit of 2 months.`
        };
      }
    }
  },
  {
    keywords: ['lock-in', 'lock in period', 'cannot vacate'],
    name: 'Lock-in Period',
    checkFn: (text) => {
      const lockMatch = text.match(/lock-in.*?(\d+)\s*month/i);
      if (!lockMatch) return null;
      
      const months = parseInt(lockMatch[1]);
      if (months >= 11) {
        return {
          verdict: 'Check this',
          meaning: `Lock-in period is ${months} months. This is quite long. You cannot leave early without penalties.`
        };
      } else {
        return {
          verdict: 'Fair',
          meaning: `Lock-in period is ${months} months. This is reasonable and protects both parties.`
        };
      }
    }
  },
  {
    keywords: ['forfeit', 'forfeited', 'will not be refunded'],
    name: 'Deposit Forfeiture',
    checkFn: (text) => {
      if (/entire.*?deposit.*?forfeit/i.test(text) || /forfeit.*?entire.*?deposit/i.test(text)) {
        return {
          verdict: 'Unfair',
          meaning: 'Forfeiting the entire deposit is excessive. Only actual damages and unpaid rent should be deducted.'
        };
      }
      return null;
    }
  },
  {
    keywords: ['rent.*?increas', 'increment', 'hike'],
    name: 'Rent Increase',
    checkFn: (text) => {
      const increaseMatch = text.match(/(\d+)%.*?year/i) || text.match(/year.*?(\d+)%/i);
      if (!increaseMatch) return null;
      
      const percent = parseInt(increaseMatch[1]);
      if (percent > 10) {
        return {
          verdict: 'Check this',
          meaning: `Rent increases by ${percent}% per year. This is quite high. The standard is 5-10%.`
        };
      } else {
        return {
          verdict: 'Fair',
          meaning: `Rent increases by ${percent}% per year. This is within the standard range.`
        };
      }
    }
  },
  {
    keywords: ['electricity', 'electric', 'power'],
    name: 'Electricity Charges',
    checkFn: (text) => {
      const rateMatch = text.match(/Rs\.?\s*(\d+).*?per unit/i) || text.match(/(\d+).*?per unit/i);
      if (!rateMatch) return null;
      
      const rate = parseInt(rateMatch[1]);
      if (rate > 10) {
        return {
          verdict: 'Check this',
          meaning: `Electricity rate is ₹${rate} per unit. This is above the normal PSPCL rate (₹6-8). Ask to see the actual bill.`
        };
      } else {
        return {
          verdict: 'Fair',
          meaning: `Electricity rate is ₹${rate} per unit. This matches the standard PSPCL rates.`
        };
      }
    }
  },
  {
    keywords: ['painting', 'paint', 'deep clean'],
    name: 'Painting/Cleaning Charges',
    checkFn: (text) => {
      if (/must.*?paint/i.test(text) || /tenant.*?paint/i.test(text)) {
        return {
          verdict: 'Unfair',
          meaning: 'Making you pay for painting is unfair. Normal wear and tear is the landlord\'s responsibility.'
        };
      }
      
      const cleanMatch = text.match(/Rs\.?\s*(\d+,?\d*).*?clean/i);
      if (cleanMatch) {
        const amount = parseInt(cleanMatch[1].replace(',', ''));
        if (amount > 3000) {
          return {
            verdict: 'Check this',
            meaning: `Deep cleaning charge of ₹${amount} is quite high. Negotiate or hire your own cleaner.`
          };
        }
      }
      return null;
    }
  },
  {
    keywords: ['notice', 'advance notice'],
    name: 'Notice Period',
    checkFn: (text) => {
      const noticeMatch = text.match(/(\d+)\s*month.*?notice/i);
      if (!noticeMatch) return null;
      
      const months = parseInt(noticeMatch[1]);
      if (months > 2) {
        return {
          verdict: 'Check this',
          meaning: `Notice period is ${months} months. This is quite long and limits your flexibility.`
        };
      } else {
        return {
          verdict: 'Fair',
          meaning: `Notice period is ${months} months. This is standard and gives both parties time to plan.`
        };
      }
    }
  },
  {
    keywords: ['no.*?visitor', 'no.*?guest', 'no male'],
    name: 'Visitor Restrictions',
    checkFn: (text) => {
      if (/no male visitor/i.test(text) || /no.*?visitor.*?allowed/i.test(text)) {
        return {
          verdict: 'Check this',
          meaning: 'Complete visitor ban is restrictive. Reasonable guest timings are fair, but complete bans may be excessive.'
        };
      }
      return null;
    }
  },
  {
    keywords: ['inspect', 'landlord.*?enter', 'right to enter'],
    name: 'Landlord Entry',
    checkFn: (text) => {
      if (/any time.*?without.*?notice/i.test(text) || /without.*?notice/i.test(text)) {
        return {
          verdict: 'Unfair',
          meaning: 'Landlord entering without notice violates your privacy. Reasonable notice (24-48 hours) should be required.'
        };
      }
      return null;
    }
  }
];

// Category colors for timeline
const PR_CATEGORY_COLORS = {
  'Move-in photos': '#2E7D4F',
  'Maintenance complaint': '#C98A12',
  'Payment/receipt': '#4E9A69',
  'Conversation': '#5B7D6F',
  'Move-out photos': '#2E7D4F',
  'Deduction': '#C0392B'
};

// Escalation steps
const PR_ESCALATION_INFO = [
  'Send a written notice to the landlord by registered post (keep the receipt)',
  'If deposit not returned, file a complaint with the Rent Authority or civil court',
  'For PG/hostel service issues, call National Consumer Helpline at 1915',
  "If it's a scam or online fraud, call 1930 and report at cybercrime.gov.in",
  'Contact your college student welfare office for support and mediation'
];
