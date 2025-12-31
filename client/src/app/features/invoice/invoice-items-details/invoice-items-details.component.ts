import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoiceService } from '../../../core/services/invoice/invoice.service';
import { Invoice, InvoiceItem } from '../../../models/invoice.mode';
import {
  CdkDragDrop,
  moveItemInArray,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { Subject, takeUntil, tap, catchError, of } from 'rxjs';
import { ToasterService } from '../../../core/services/toaster/toaster.service';

@Component({
  selector: 'app-invoice-items-details',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule],
  templateUrl: './invoice-items-details.component.html',
  styleUrl: './invoice-items-details.component.scss',
})
export class InvoiceItemsDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  invoice!: Invoice;
  invoiceId: string = '';
  invoiceItems: InvoiceItem[] = [];
  invoiceForm!: FormGroup;
  itemForm!: FormGroup;

  isEditing: boolean = false;
  selectedIndex: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private invoiceService: InvoiceService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.initForm();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(({ uuid }) => {
      this.invoiceId = uuid;
      this.getInvoice();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getInvoice(): void {
    this.invoiceService
      .getInvoice(this.invoiceId)
      .pipe(
        tap((res) => {
          this.invoice = res;
          this.invoiceForm.patchValue(res);
          this.invoiceItems = res.invoice_items || [];
          if (this.invoiceItems.length) this.resetItemForm();
        }),
        catchError((err) => {
          console.error('Invoice Error: ', err);
          this.toasterService.toast('Error fetching invoice.');
          this.router.navigate(['/invoices']);

          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  initForm(): void {
    this.invoiceForm = this.formBuilder.group({});
    this.initItemForm();
  }

  initItemForm(): void {
    this.itemForm = this.formBuilder.group({
      sl_no: [this.invoiceItems.length + 1, Validators.required],
      name: ['', Validators.required],
      quantity: [null, Validators.required],
      rate: [null, Validators.required],
      amount: [{ value: 0, disabled: true }],
    });
  }

  updateAmount(): void {
    const qty = this.itemForm.get('quantity')?.value || 0;
    const rate = this.itemForm.get('rate')?.value || 0;
    this.itemForm.get('amount')?.setValue(qty * rate);
  }

  addItem(): void {
    if (this.itemForm.invalid) return;

    const item: InvoiceItem = this.itemForm.getRawValue();
    item.name = item.name.toUpperCase();
    item.amount = Math.round(item.quantity * item.rate);
    item.uuid = crypto.randomUUID();

    this.invoiceItems.push(item);
    this.resetItemForm();
  }

  onEditItem(index: number): void {
    this.selectedIndex = index;
    this.isEditing = true;
    const item = this.invoiceItems[index];
    this.itemForm.setValue({
      sl_no: item.sl_no,
      name: item.name,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    });
  }

  updateItem(): void {
    if (this.itemForm.invalid || this.selectedIndex === null) return;
    const updated = this.itemForm.getRawValue();
    updated.name = updated.name.toUpperCase();
    updated.uuid = this.invoiceItems[this.selectedIndex].uuid;
    updated.amount = Math.round(updated.quantity * updated.rate);
    this.invoiceItems[this.selectedIndex] = updated;
    this.resetItemForm();
  }

  deleteItem(): void {
    if (this.selectedIndex !== null) {
      this.invoiceItems.splice(this.selectedIndex, 1);

      this.invoiceItems = this.invoiceItems.map((item, index) => ({
        ...item,
        sl_no: (index + 1).toString(),
      }));

      this.resetItemForm();
    }
  }

  resetItemForm(): void {
    this.itemForm.reset({
      sl_no: this.invoiceItems.length + 1,
      name: '',
      quantity: null,
      rate: null,
      amount: 0,
    });
    this.isEditing = false;
    this.selectedIndex = null;
  }

  dropItem(event: CdkDragDrop<InvoiceItem[]>): void {
    moveItemInArray(this.invoiceItems, event.previousIndex, event.currentIndex);

    this.invoiceItems = this.invoiceItems.map((item, index) => ({
      ...item,
      sl_no: (index + 1).toString(),
    }));
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid || !this.invoiceItems.length) return;

    const formValues = this.invoiceForm.getRawValue();
    const payload = { ...formValues, invoice_items: this.invoiceItems };

    this.invoiceService
      .updateInvoice(this.invoiceId, payload)
      .pipe(
        tap(() => {
          this.router.navigate(['/invoices/amount-details', this.invoiceId]);
        }),
        catchError((err) => {
          console.error('Update Error: ', err);
          this.toasterService.toast('Error updating invoice.');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  navigateBack(): void {
    this.router.navigate(['/invoices/basic-details', this.invoiceId]);
  }
}
