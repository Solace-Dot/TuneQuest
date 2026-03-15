from django.db import models

class Plan(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    skill = models.ForeignKey('exercises.Skill', on_delete=models.CASCADE)
    file = models.ForeignKey('exercises.FileUpload', on_delete=models.SET_NULL, null=True, blank=True)
    instrument = models.ForeignKey('exercises.Instrument', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    generated_by_ai = models.BooleanField(default=False)
    plan_content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Subscription(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    plan_type = models.CharField(max_length=50)
    subscription_status = models.CharField(max_length=50)
    paypal_payer_id = models.CharField(max_length=255, blank=True, null=True)
    paypal_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    auto_renew = models.BooleanField(default=True)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} - {self.plan_type}"

class Payment(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE)
    transaction_id = models.CharField(max_length=255, unique=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    payment_gateway = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.transaction_id} - {self.amount}"

