function relativeDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export const demoDisputes = [
  {
    id: "DD-4108",
    orderId: "ORD-22014",
    customerName: "Taylor Morgan",
    amount: 129,
    currency: "USD",
    reason: "Item not received",
    responseDeadline: relativeDate(2),
    status: "needs_response",
    resolution: null,
    recommendedAction: "Check carrier tracking and delivery confirmation.",
    actionDisclaimer:
      "Static demo prompt for human review — not an AI prediction.",
    openedAt: relativeDate(-5),
    orderDescription: "Sage linen weekend bag",
    customerMessage:
      "The tracking page says delivered, but I have not received the package.",
    evidenceChecklist: [
      "Order confirmation and item description",
      "Carrier tracking history",
      "Delivery confirmation or carrier correspondence",
      "Customer communication related to delivery",
    ],
  },
  {
    id: "DD-4107",
    orderId: "ORD-21982",
    customerName: "Jordan Lee",
    amount: 86.5,
    currency: "USD",
    reason: "Unauthorized transaction",
    responseDeadline: relativeDate(5),
    status: "under_review",
    resolution: null,
    recommendedAction: "Review the order, billing, and account-access records.",
    actionDisclaimer:
      "Static demo prompt for human review — not an AI prediction.",
    openedAt: relativeDate(-3),
    orderDescription: "Wireless studio earbuds",
    customerMessage: "I do not recognize this transaction on my account.",
    evidenceChecklist: [
      "Order details and item description",
      "Billing and shipping information on the order",
      "Fulfillment or delivery records",
      "Relevant customer correspondence",
    ],
  },
  {
    id: "DD-4106",
    orderId: "ORD-21755",
    customerName: "Avery Patel",
    amount: 214,
    currency: "USD",
    reason: "Significantly not as described",
    responseDeadline: relativeDate(-2),
    status: "resolved",
    resolution: "Resolved in this simulated dataset",
    recommendedAction: "No action shown for this resolved demo case.",
    actionDisclaimer:
      "This case status is simulated and does not reflect a real payment decision.",
    openedAt: relativeDate(-12),
    orderDescription: "Handmade oak desk organizer",
    customerMessage:
      "The finish looks different from the product photos I saw.",
    evidenceChecklist: [
      "Original product listing and photographs",
      "Order confirmation and item description",
      "Customer correspondence about the product",
      "Return or replacement policy shown at purchase",
    ],
  },
];

export const demoActivity = [
  {
    id: "ACT-1001",
    disputeId: "DD-4108",
    title: "Demo dispute added",
    description: "A simulated item-not-received case was added for review.",
    timestamp: relativeDate(-5),
  },
  {
    id: "ACT-1002",
    disputeId: "DD-4107",
    title: "Demo case moved to review",
    description: "The sample unauthorized-transaction case is marked under review.",
    timestamp: relativeDate(-2),
  },
  {
    id: "ACT-1003",
    disputeId: "DD-4106",
    title: "Demo case marked resolved",
    description: "This status is part of the simulated sample data only.",
    timestamp: relativeDate(-1),
  },
  {
    id: "ACT-1004",
    disputeId: "DD-4108",
    title: "Response deadline approaching",
    description: "The sample case deadline is within the next few days.",
    timestamp: relativeDate(0),
  },
];
