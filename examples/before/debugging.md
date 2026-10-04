I looked into why the application has been getting slower, and I believe I have found the root cause.

The p95 latency was stable at roughly 100 ms in the morning, but it began climbing at around 10:00 and has now reached about 680 ms, which is an increase of more than 500%. This lines up closely with the deployment of commit a3f9c1, which happened about four minutes before the first slow request was recorded.

That commit changed the order history loader in `src/orders/history.ts`. The new code calls `load()` for every order inside `orders.map(...)`, which results in a classic N+1 query pattern: one database query per order. For an account with 213 orders, a single request now performs 214 SELECT statements. Under load this exhausts the database connection pool, which is currently at 100% utilisation, and that in turn slows down every other request as well. Interestingly, the error rate is still low at 0.4%, so requests are slow rather than failing.

To confirm this, I reverted the commit on staging, and the p95 latency went back to 104 ms.

My recommendation is to replace the per-order `load()` call with a single batched query using `WHERE id IN (...)`, and to add a regression test that asserts the number of queries per request. Let me know if you would like me to implement the fix.
