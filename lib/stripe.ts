export const stripe = {
  customers: {
    del: async (id: string) => {
      console.log(`[Mock Stripe] Deleting customer ${id}`);
      return { deleted: true };
    }
  }
};
