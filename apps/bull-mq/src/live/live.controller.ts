import { Controller, Get, Param } from "@nestjs/common";
import { LiveService } from "./live.service";
@Controller('live')
export class LiveController{
    constructor(private LiveService:LiveService){}
    @Get('calls')
    async getCallActive(){
    const calls = await this.LiveService.getAllActiveCalls();
    return { success: true, total: calls.length, data: calls };
    }
    @Get('calls/:eventId')
    async getCall(@Param('eventId') eventId: string){
        const call = await this.LiveService.getCallEvent(eventId);
        return { success: true, data: call };
    }
}