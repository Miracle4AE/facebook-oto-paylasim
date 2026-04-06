"use client";

import type { Control } from "react-hook-form";
import { ContentPostStatus } from "@/types/domain";
import type { ContentPostFormValues } from "@/lib/content-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  control: Control<ContentPostFormValues>;
  disabled?: boolean;
};

export function ContentFormFields({ control, disabled }: Props) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Başlık (isteğe bağlı)</FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="body"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Paylaşım metni</FormLabel>
            <FormControl>
              <Textarea {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Durum</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={ContentPostStatus.DRAFT}>Taslak</SelectItem>
                <SelectItem value={ContentPostStatus.SCHEDULED}>Planlandı</SelectItem>
                <SelectItem value={ContentPostStatus.PUBLISHED}>Yayınlandı</SelectItem>
                <SelectItem value={ContentPostStatus.FAILED}>Hata</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
