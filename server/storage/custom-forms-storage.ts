/**
 * Custom Form Builder Storage Module
 * Handles CRUD operations for custom forms, fields, and submissions
 */
import { db } from "../db";
import { 
  customFormTemplates, 
  customFormFields, 
  formFieldOptions, 
  customFormSubmissions 
} from "@shared/schema";
import type { 
  CustomFormTemplate, 
  InsertCustomFormTemplate,
  CustomFormField,
  InsertCustomFormField,
  FormFieldOption,
  InsertFormFieldOption,
  CustomFormSubmission,
  InsertCustomFormSubmission
} from "@shared/schema";
import { eq, and, desc, ilike, or, asc } from "drizzle-orm";

export class CustomFormsStorage {
  // ============================================================================
  // FORM TEMPLATE METHODS
  // ============================================================================

  async getFormTemplatesByOrganization(organizationId: number): Promise<CustomFormTemplate[]> {
    return await db
      .select()
      .from(customFormTemplates)
      .where(eq(customFormTemplates.organizationId, organizationId))
      .orderBy(desc(customFormTemplates.updatedAt));
  }

  async getFormTemplate(id: number): Promise<CustomFormTemplate | undefined> {
    const result = await db
      .select()
      .from(customFormTemplates)
      .where(eq(customFormTemplates.id, id))
      .limit(1);
    
    return result[0] as CustomFormTemplate | undefined;
  }

  async createFormTemplate(template: InsertCustomFormTemplate): Promise<CustomFormTemplate> {
    const result = await db
      .insert(customFormTemplates)
      .values(template)
      .returning();
    
    return result[0];
  }

  async updateFormTemplate(id: number, updates: Partial<CustomFormTemplate>): Promise<CustomFormTemplate> {
    const result = await db
      .update(customFormTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customFormTemplates.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFormTemplate(id: number): Promise<void> {
    // First delete all related data
    await this.deleteFormFields(id);
    await this.deleteFormSubmissions(id);
    
    // Then delete the template
    await db
      .delete(customFormTemplates)
      .where(eq(customFormTemplates.id, id));
  }

  async cloneFormTemplate(id: number, newName: string, organizationId: number, createdBy: string): Promise<CustomFormTemplate> {
    const originalTemplate = await this.getFormTemplate(id);
    if (!originalTemplate) {
      throw new Error("Template not found");
    }

    const originalFields = await this.getFormFieldsByTemplate(id);

    // Create new template
    const newTemplate = await this.createFormTemplate({
      ...originalTemplate,
      name: newName,
      organizationId,
      createdBy,
      updatedBy: createdBy,
      parentFormId: id,
      version: 1
    });

    // Clone all fields
    for (const field of originalFields) {
      const newField = await this.createFormField({
        ...field,
        formId: newTemplate.id
      });

      // Clone field options if they exist
      const options = await this.getFormFieldOptions(field.id);
      for (const option of options) {
        await this.createFormFieldOption({
          ...option,
          fieldId: newField.id
        });
      }
    }

    return newTemplate;
  }

  // ============================================================================
  // FORM FIELD METHODS
  // ============================================================================

  async getFormFieldsByTemplate(formId: number): Promise<CustomFormField[]> {
    return await db
      .select()
      .from(customFormFields)
      .where(eq(customFormFields.formId, formId))
      .orderBy(asc(customFormFields.displayOrder));
  }

  async createFormField(field: InsertCustomFormField): Promise<CustomFormField> {
    const result = await db
      .insert(customFormFields)
      .values(field)
      .returning();
    
    return result[0];
  }

  async updateFormField(id: number, updates: Partial<CustomFormField>): Promise<CustomFormField> {
    const result = await db
      .update(customFormFields)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customFormFields.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFormField(id: number): Promise<void> {
    // First delete field options
    await db
      .delete(formFieldOptions)
      .where(eq(formFieldOptions.fieldId, id));
    
    // Then delete the field
    await db
      .delete(customFormFields)
      .where(eq(customFormFields.id, id));
  }

  async deleteFormFields(formId: number): Promise<void> {
    const fields = await this.getFormFieldsByTemplate(formId);
    for (const field of fields) {
      await this.deleteFormField(field.id);
    }
  }

  async reorderFormFields(formId: number, fieldOrders: { fieldId: number; displayOrder: number }[]): Promise<void> {
    for (const { fieldId, displayOrder } of fieldOrders) {
      await db
        .update(customFormFields)
        .set({ displayOrder, updatedAt: new Date() })
        .where(eq(customFormFields.id, fieldId));
    }
  }

  // ============================================================================
  // FORM FIELD OPTIONS METHODS
  // ============================================================================

  async getFormFieldOptions(fieldId: number): Promise<FormFieldOption[]> {
    return await db
      .select()
      .from(formFieldOptions)
      .where(eq(formFieldOptions.fieldId, fieldId))
      .orderBy(asc(formFieldOptions.displayOrder));
  }

  async createFormFieldOption(option: InsertFormFieldOption): Promise<FormFieldOption> {
    const result = await db
      .insert(formFieldOptions)
      .values(option)
      .returning();
    
    return result[0];
  }

  async updateFormFieldOption(id: number, updates: Partial<FormFieldOption>): Promise<FormFieldOption> {
    const result = await db
      .update(formFieldOptions)
      .set(updates)
      .where(eq(formFieldOptions.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFormFieldOption(id: number): Promise<void> {
    await db
      .delete(formFieldOptions)
      .where(eq(formFieldOptions.id, id));
  }

  // ============================================================================
  // FORM SUBMISSION METHODS
  // ============================================================================

  async getFormSubmissionsByTemplate(formId: number): Promise<CustomFormSubmission[]> {
    return await db
      .select()
      .from(customFormSubmissions)
      .where(eq(customFormSubmissions.formId, formId))
      .orderBy(desc(customFormSubmissions.updatedAt));
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<CustomFormSubmission[]> {
    return await db
      .select()
      .from(customFormSubmissions)
      .where(eq(customFormSubmissions.organizationId, organizationId))
      .orderBy(desc(customFormSubmissions.updatedAt));
  }

  async getFormSubmission(id: number): Promise<CustomFormSubmission | undefined> {
    const result = await db
      .select()
      .from(customFormSubmissions)
      .where(eq(customFormSubmissions.id, id))
      .limit(1);
    
    return result[0];
  }

  async createFormSubmission(submission: InsertCustomFormSubmission): Promise<CustomFormSubmission> {
    const result = await db
      .insert(customFormSubmissions)
      .values(submission)
      .returning();
    
    return result[0];
  }

  async updateFormSubmission(id: number, updates: Partial<CustomFormSubmission>): Promise<CustomFormSubmission> {
    const result = await db
      .update(customFormSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customFormSubmissions.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFormSubmissions(formId: number): Promise<void> {
    await db
      .delete(customFormSubmissions)
      .where(eq(customFormSubmissions.formId, formId));
  }

  async markSubmissionProcessed(id: number, processedBy: string): Promise<CustomFormSubmission> {
    return this.updateFormSubmission(id, {
      status: 'processed',
      processedAt: new Date(),
      processedBy
    });
  }

  async getSubmissionsByStatus(organizationId: number, status: string): Promise<CustomFormSubmission[]> {
    return await db
      .select()
      .from(customFormSubmissions)
      .where(and(
        eq(customFormSubmissions.organizationId, organizationId),
        eq(customFormSubmissions.status, status)
      ))
      .orderBy(desc(customFormSubmissions.updatedAt));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getCompleteFormDefinition(formId: number): Promise<{
    template: CustomFormTemplate;
    fields: (CustomFormField & { options?: FormFieldOption[] })[];
  } | null> {
    const template = await this.getFormTemplate(formId);
    if (!template) {
      return null;
    }

    const fields = await this.getFormFieldsByTemplate(formId);
    const fieldsWithOptions = await Promise.all(
      fields.map(async (field) => ({
        ...field,
        options: await this.getFormFieldOptions(field.id)
      }))
    );

    return {
      template,
      fields: fieldsWithOptions
    };
  }

  async getFormStatistics(organizationId: number): Promise<{
    totalForms: number;
    activeForms: number;
    totalSubmissions: number;
    pendingSubmissions: number;
    processedSubmissions: number;
  }> {
    const allForms = await this.getFormTemplatesByOrganization(organizationId);
    const allSubmissions = await this.getFormSubmissionsByOrganization(organizationId);

    return {
      totalForms: allForms.length,
      activeForms: allForms.filter(f => f.isActive).length,
      totalSubmissions: allSubmissions.length,
      pendingSubmissions: allSubmissions.filter(s => s.status === 'draft' || s.status === 'submitted').length,
      processedSubmissions: allSubmissions.filter(s => s.status === 'processed').length
    };
  }

  async searchForms(organizationId: number, searchTerm: string): Promise<CustomFormTemplate[]> {
    return await db
      .select()
      .from(customFormTemplates)
      .where(and(
        eq(customFormTemplates.organizationId, organizationId),
        or(
          ilike(customFormTemplates.name, `%${searchTerm}%`),
          ilike(customFormTemplates.description, `%${searchTerm}%`)
        )
      ))
      .orderBy(desc(customFormTemplates.updatedAt));
  }
}