"use client"

import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hook"
import { submitRegistrationRequest, uploadRegistrationDocument, type CreateRegistrationRequestPayload } from "@/features/field-owner-registration"
// Note: uploadRegistrationDocument is now only used for business license upload
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomSuccessToast, CustomFailedToast } from "@/components/toast/notificiation-toast"
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component"
import { PageWrapper } from "@/components/layouts/page-wrapper"
import PageHeader from "@/components/header-banner/page-header"
import { User, Building2, FileText, CheckCircle, AlertTriangle } from "lucide-react"
import { StepIndicator } from "./StepIndicator"
import PersonalInfoStep from "./PersonalInfoStep"
import { FacilityInfoStep } from "./FacilityInfoStep"
import { DocumentsStep } from "./DocumentsStep"
import { ConfirmationStep } from "./ConfirmationStep"
import { StepNavigation } from "./StepNavigation"
import { ImportantNotes } from "./ImportantNotes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import logger from "@/utils/logger"
import { Button } from "@/components/ui/button"

type RegistrationStep = 1 | 2 | 3 | 4

export default function FieldOwnerRegistrationPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { submitting } = useAppSelector((state) => state.registration)
  const authUser = useAppSelector((state) => state.auth.user)

  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateRegistrationRequestPayload>>({
    personalInfo: {
      fullName: authUser?.fullName || "",
      idNumber: "",
      address: "",
    },
    fieldImages: [],
    // documents: only businessLicense, optional
    documents: {},
    // eKYC fields (to be populated from didit eKYC integration)
    ekycSessionId: undefined,
    ekycData: undefined,
  })

  const steps = [
    { number: 1, title: "Thông tin cá nhân & eKYC", icon: User },
    { number: 2, title: "Thông tin cơ sở vật chất", icon: Building2 },
    { number: 3, title: "Ảnh sân & Giấy ĐKKD (tuỳ chọn)", icon: FileText },
    { number: 4, title: "Xác nhận", icon: CheckCircle },
  ]

  const handleFormDataChange = (data: Partial<CreateRegistrationRequestPayload>) => {
    setFormData(data)
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as RegistrationStep)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as RegistrationStep)
    }
  }

  const handleSubmitClick = () => {
    // Validate before showing confirmation dialog
    if (!formData.ekycSessionId || !formData.ekycData) {
      CustomFailedToast("Vui lòng hoàn thành xác thực danh tính bằng didit eKYC ở bước 1")
      return
    }

    if (!formData.personalInfo?.fullName || !formData.personalInfo?.idNumber || !formData.personalInfo?.address) {
      CustomFailedToast("Vui lòng điền đầy đủ thông tin cá nhân")
      return
    }

    if (!formData.facilityName || !formData.facilityLocation || !formData.description || !formData.contactPhone) {
      CustomFailedToast("Vui lòng điền đầy đủ thông tin cơ sở vật chất")
      return
    }

    const documents = formData.documents as any
    const fieldImagesFiles: File[] = documents?.fieldImagesFiles || []
    if (fieldImagesFiles.length < 5) {
      CustomFailedToast("Vui lòng upload ít nhất 5 ảnh sân")
      return
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  const handleSubmit = async () => {
    setShowConfirmDialog(false)

    try {
      // Validate field images (required >= 5)
      const documents = formData.documents as any
      const fieldImagesFiles: File[] = documents?.fieldImagesFiles || []
      if (fieldImagesFiles.length < 5) {
        CustomFailedToast("Vui lòng upload ít nhất 5 ảnh sân")
        return
      }

      // Upload field images first
      let uploadedFieldImageUrls: string[] = []
      try {
        CustomSuccessToast("Đang tải lên ảnh sân...")
        const uploadPromises = fieldImagesFiles.map((file: File) =>
          dispatch(uploadRegistrationDocument(file)).unwrap()
        )
        uploadedFieldImageUrls = await Promise.all(uploadPromises)

        // Validate all URLs
        if (uploadedFieldImageUrls.some(url => !url || typeof url !== 'string' || url.trim() === '')) {
          throw new Error('Một số ảnh upload không thành công')
        }
      } catch (error: any) {
        CustomFailedToast(`Lỗi khi tải lên ảnh sân: ${error.message || 'Upload thất bại'}`)
        return
      }

      // Handle business license upload (optional)
      let businessLicenseUrl: string | undefined = undefined

      if (documents) {
        const businessLicenseFile = documents.businessLicense_file
        if (businessLicenseFile instanceof File) {
          try {
            CustomSuccessToast("Đang tải lên giấy ĐKKD...")
            businessLicenseUrl = await dispatch(uploadRegistrationDocument(businessLicenseFile)).unwrap()
            if (!businessLicenseUrl || typeof businessLicenseUrl !== 'string' || businessLicenseUrl.trim() === '') {
              throw new Error('URL không hợp lệ từ server')
            }
          } catch (error: any) {
            CustomFailedToast(`Lỗi khi tải lên giấy ĐKKD: ${error.message || 'Upload thất bại'}`)
            return
          }
        } else if (documents.businessLicense && typeof documents.businessLicense === 'string' && documents.businessLicense.trim() !== '') {
          businessLicenseUrl = documents.businessLicense
        }
      }

      // Create payload
      const payload: CreateRegistrationRequestPayload = {
        personalInfo: formData.personalInfo!,
        // Facility information
        facilityName: formData.facilityName,
        facilityLocation: formData.facilityLocation,
        facilityLocationCoordinates: formData.facilityLocationCoordinates,
        description: formData.description,
        contactPhone: formData.contactPhone,
        businessHours: formData.businessHours,
        website: formData.website,
        fieldImages: uploadedFieldImageUrls, // Use uploaded URLs instead of blob URLs
        // Only include business license in documents (optional)
        documents: businessLicenseUrl
          ? {
            businessLicense: businessLicenseUrl,
          }
          : undefined,
        // eKYC fields
        ekycSessionId: formData.ekycSessionId,
        ekycData: formData.ekycData,
      }

      await dispatch(submitRegistrationRequest(payload)).unwrap()
      CustomSuccessToast("Đăng ký thành công! Chúng tôi sẽ xem xét trong vòng 1-3 ngày.")
      navigate("/field-owner-registration-status")
    } catch (error: any) {
      logger.error('Registration error:', error)
      CustomFailedToast(error.message || "Đăng ký thất bại")
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoStep formData={formData} onFormDataChange={handleFormDataChange} />
      case 2:
        return <FacilityInfoStep formData={formData} onFormDataChange={handleFormDataChange} />
      case 3:
        return <DocumentsStep formData={formData} onFormDataChange={handleFormDataChange} />
      case 4:
        return <ConfirmationStep formData={formData} />
      default:
        return null
    }
  }

  return (
    <>
      <NavbarDarkComponent />
      <PageWrapper>
        <PageHeader
          title="Đăng ký làm chủ sân"
          breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Đăng ký chủ sân" }]}
        />

        <div className="max-w-5xl mx-auto px-4 py-8">
          <StepIndicator currentStep={currentStep} />

          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-linear-to-r from-primary/5 to-primary/10 border-b">
              <div className="flex items-center gap-3">
                {React.createElement(steps[currentStep - 1].icon, {
                  className: "w-6 h-6 text-primary",
                })}
                <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Bước {currentStep} / {steps.length}
              </p>
            </CardHeader>
            <CardContent className="p-8">
              {renderStepContent()}

              <StepNavigation
                currentStep={currentStep}
                submitting={submitting}
                onBack={handleBack}
                onNext={handleNext}
                onSubmit={handleSubmitClick}
              />
            </CardContent>
          </Card>

          <ImportantNotes />
        </div>
      </PageWrapper>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold">
                Xác nhận đăng ký
              </AlertDialogTitle>
            </div>
            <div className="text-gray-600 space-y-2">
              <AlertDialogDescription>
                Bạn có chắc chắn muốn gửi đơn đăng ký làm chủ sân không?
              </AlertDialogDescription>
              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Lưu ý:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Ảnh sân sẽ được tải lên server khi bạn xác nhận</li>
                  <li>Đơn đăng ký sẽ được xem xét trong vòng 1-3 ngày làm việc</li>
                  <li>Bạn sẽ nhận được email thông báo khi có kết quả</li>
                </ul>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Hủy
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleSubmit}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận và gửi đơn"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

